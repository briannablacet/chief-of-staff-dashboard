/**
 * Core job-matching pipeline — imported by both the route handler and the
 * regenerateMatches Server Action so neither needs an HTTP round-trip.
 */

import { generateText } from "ai"
import { getDb } from "@/lib/mongodb"
import { fetchAdzunaJobs, fetchRemotiveJobs, fetchRemoteOKJobs, fetchWWRJobs, fetchJSearchJobs, type RawJob } from "@/lib/job-fetcher"
import type { DirectivesDoc, MatchDoc, AgentDoc } from "@/lib/actions"

export async function runJobPipeline(): Promise<{ saved: number; message?: string }> {
  const db = await getDb()

  // 1. Load directives for ALL users who have configured them
  const allDirectives = await db
    .collection<DirectivesDoc>("directives")
    .find({})
    .toArray()

  console.log("[v0] pipeline: found", allDirectives.length, "directives docs")
  allDirectives.forEach((d, i) => {
    console.log(`[v0] pipeline: directives[${i}] userId=${d.userId} titles=${JSON.stringify(d.titles)} remoteOnly=${d.remoteOnly} minScore=${d.minMatchScore}`)
  })

  if (!allDirectives.length) return { saved: 0, message: "No directives configured" }

  let totalSaved = 0

  for (const directives of allDirectives) {
    const saved = await runPipelineForUser(db, directives)
    totalSaved += saved
  }

  return { saved: totalSaved }
}

async function runPipelineForUser(
  db: Awaited<ReturnType<typeof getDb>>,
  directives: DirectivesDoc
): Promise<number> {
  const USER_ID = directives.userId

  const {
    titles = [],
    locations = [],
    remoteOnly = false,
    salaryMin = 185,
    dealbreakers = [],
    dailyMatchLimit = 10,
    minMatchScore: rawMinScore = 20,
    resumeText = "",
    resumes = [],
    name: userName = "the applicant",
    defaultCoverLetter = "",
  } = directives

  // Use the configured threshold directly — don't cap it, or low-scoring
  // jobs will always slip through regardless of what the user sets.
  const minMatchScore = rawMinScore ?? 30

  console.log(`[v0] pipeline user=${USER_ID}: titles=${JSON.stringify(titles)} remoteOnly=${remoteOnly} minScore=${minMatchScore}`)
  if (!titles.length) {
    console.log(`[v0] pipeline user=${USER_ID}: no titles configured, skipping`)
    return 0
  }

  const defaultResume = resumes.find((r) => r.isDefault) ?? resumes[0]
  const resumeForCoverLetter = defaultResume?.text || resumeText

  // 2. Clear stale agent-sourced matches (older than 3 days)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  await db.collection<MatchDoc>("matches").deleteMany({
    userId: USER_ID,
    matchId: /^(adzuna|remotive|remoteok|wwr|jsearch):/,
    updatedAt: { $lt: threeDaysAgo },
  })

  // 3. Build dedup sets from remaining agent matches — by matchId AND by company+role
  const existing = await db
    .collection<MatchDoc>("matches")
    .find(
      { userId: USER_ID, matchId: /^(adzuna|remotive|remoteok|wwr|jsearch):/ },
      { projection: { matchId: 1, company: 1, role: 1 } }
    )
    .toArray()
  const existingIds = new Set(existing.map((m) => m.matchId))
  const existingRoles = new Set(existing.map((m) => `${m.company}|${m.role}`.toLowerCase()))

  // 4. Fetch from all sources in parallel
  const [adzunaJobs, remotiveJobs, remoteokJobs, wwrJobs, jsearchJobs] = await Promise.all([
    fetchAdzunaJobs(titles, locations, remoteOnly, 40),
    remoteOnly ? fetchRemotiveJobs(titles, 30) : Promise.resolve([]),
    remoteOnly ? fetchRemoteOKJobs(titles, 30) : Promise.resolve([]),
    remoteOnly ? fetchWWRJobs(titles, 30) : Promise.resolve([]),
    fetchJSearchJobs(titles, remoteOnly, 50),
  ])
  const rawJobs = [...adzunaJobs, ...remotiveJobs, ...remoteokJobs, ...wwrJobs, ...jsearchJobs]
  console.log(
    `[v0] pipeline user=${USER_ID}: adzuna=${adzunaJobs.length} remotive=${remotiveJobs.length}` +
    ` remoteok=${remoteokJobs.length} wwr=${wwrJobs.length} jsearch=${jsearchJobs.length}` +
    ` total=${rawJobs.length}`
  )

  // Deduplicate within the current batch by sourceId AND by company+role
  const seenInBatch = new Set<string>()
  const seenRolesInBatch = new Set<string>()
  const allJobs: RawJob[] = rawJobs.filter((j) => {
    if (seenInBatch.has(j.sourceId)) return false
    const roleKey = `${j.company}|${j.title}`.toLowerCase()
    if (seenRolesInBatch.has(roleKey)) return false
    seenInBatch.add(j.sourceId)
    seenRolesInBatch.add(roleKey)
    return true
  })
  const newJobs = allJobs.filter((j) => {
    if (existingIds.has(j.sourceId)) return false
    if (existingRoles.has(`${j.company}|${j.title}`.toLowerCase())) return false
    return true
  })

  console.log(`[v0] pipeline user=${USER_ID}: fetched ${allJobs.length} total, ${newJobs.length} new after dedup`)
  if (!newJobs.length) {
    await recordLastRun(db, USER_ID)
    return 0
  }

  // 5. Score + filter
  const scored: { match: MatchDoc; score: number }[] = []

  for (const job of newJobs.slice(0, dailyMatchLimit * 4)) {
    const result = scoreJobKeywords(job, directives, USER_ID)
    if (!result) {
      console.log(`[v0] pipeline: job ${job.sourceId} hard-rejected (remote filter)`)
      continue
    }
    if (result.score < minMatchScore) {
      console.log(`[v0] pipeline: job ${job.sourceId} score=${result.score} below min=${minMatchScore}`)
      continue
    }

    // Dealbreaker filter
    const descLower = job.description.toLowerCase()
    const hitsDealbreaker = dealbreakers.some(
      (d) => d.trim() && descLower.includes(d.trim().toLowerCase())
    )
    if (hitsDealbreaker) {
      console.log(`[v0] pipeline: job ${job.sourceId} hit dealbreaker`)
      continue
    }

    scored.push(result)
    if (scored.length >= dailyMatchLimit) break
  }

  console.log(`[v0] pipeline user=${USER_ID}: ${scored.length} jobs passed all filters`)
  if (!scored.length) {
    await recordLastRun(db, USER_ID)
    return 0
  }

  // 6. Generate cover letters sequentially
  const withLetters: MatchDoc[] = []
  for (const { match } of scored) {
    try {
      const letter = await generateCoverLetter(match, resumeForCoverLetter, userName, defaultCoverLetter)
      withLetters.push({ ...match, coverLetter: letter })
    } catch (err) {
      console.error("[pipeline] Cover letter failed for", match.matchId, err)
      withLetters.push(match)
    }
    // Avoid rate-limiting between LLM calls
    await new Promise((r) => setTimeout(r, 2000))
  }

  // 7. Upsert into MongoDB
  for (const match of withLetters) {
    await db.collection<MatchDoc>("matches").updateOne(
      { userId: USER_ID, matchId: match.matchId },
      { $set: match },
      { upsert: true }
    )
  }

  await recordLastRun(db, USER_ID)
  return withLetters.length
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function scoreJobKeywords(
  job: RawJob,
  directives: DirectivesDoc,
  userId: string
): { match: MatchDoc; score: number; salaryValue?: number } | null {
  const { titles, locations, remoteOnly, salaryMin, salaryMax } = directives
  const titleLower = job.title.toLowerCase()
  const descLower = job.description.toLowerCase()
  const locationLower = (job.location ?? "").toLowerCase()

  const breakdown: { label: string; met: boolean; note: string }[] = []
  let score = 0

  // Title (40 pts)
  const exactTitleMatch = titles.some((t) => titleLower.includes(t.toLowerCase()))
  const titleKeywords = [...new Set(
    titles.flatMap((t) => t.toLowerCase().split(/\s+/).filter((w) => w.length > 3))
  )]
  const matchedKeywords = titleKeywords.filter(
    (kw) => titleLower.includes(kw) || descLower.includes(kw)
  )
  const keywordRatio = matchedKeywords.length / Math.max(titleKeywords.length, 1)
  const titleScore = exactTitleMatch ? 40 : Math.min(40, Math.round(keywordRatio * 50))
  score += titleScore
  breakdown.push({
    label: "Title alignment",
    met: titleScore >= 15,
    note: titleScore >= 15
      ? `Matched: ${matchedKeywords.slice(0, 3).join(", ")}`
      : `Looking for: ${titles.slice(0, 2).join(", ")}`,
  })

  // Location / remote (20 pts)
  // Cast a wide net — many job boards only partially label remote roles
  const isRemoteJob =
    locationLower.includes("remote") ||
    titleLower.includes("remote") ||
    descLower.includes("remote") ||
    descLower.includes("work from home") ||
    descLower.includes("distributed team") ||
    descLower.includes("anywhere") ||
    job.source === "remotive" || // Remotive, RemoteOK, WWR are 100% remote boards
    job.source === "remoteok" ||
    job.source === "wwr"

  const prefersRemote = remoteOnly || locations.some((l) => l.toLowerCase().includes("remote"))
  const cityLocations = locations.filter((l) => !l.toLowerCase().includes("remote"))

  if (prefersRemote) {
    // Soft reject non-remote when remoteOnly — score 0 but don't hard-reject,
    // so if titles/seniority score high enough the job can still surface
    score += isRemoteJob ? 20 : 0
    breakdown.push({
      label: "Remote work",
      met: isRemoteJob,
      note: isRemoteJob ? "Position is remote" : "Position does not appear to be remote",
    })
  } else if (cityLocations.length) {
    const locationMatch = cityLocations.some(
      (loc) => locationLower.includes(loc.toLowerCase()) || descLower.includes(loc.toLowerCase())
    )
    const met = locationMatch || isRemoteJob
    score += met ? 20 : 10
    breakdown.push({
      label: "Location",
      met,
      note: met ? (isRemoteJob ? "Remote position" : `Matches ${cityLocations[0]}`) : `Looking for ${cityLocations.slice(0, 2).join(" or ")}`,
    })
  } else {
    score += 15
    breakdown.push({ label: "Location", met: true, note: "No location preference set" })
  }

  // Seniority (20 pts)
  const seniorityTerms = ["director", "senior", "lead", "head of", "principal", "manager", "vp", "vice president"]
  const targetSeniority = titles.some((t) => seniorityTerms.some((s) => t.toLowerCase().includes(s)))
  const jobHasSeniority = seniorityTerms.some((s) => titleLower.includes(s))
  const seniorityMet = !targetSeniority || jobHasSeniority
  score += seniorityMet ? 20 : 5
  breakdown.push({
    label: "Seniority level",
    met: seniorityMet,
    note: seniorityMet ? "Seniority level aligns" : "Job may be below target seniority",
  })

  // Salary (20 pts)
  // salaryMin is stored in thousands (e.g. 190 = $190k) — normalise to full dollars
  const salaryFloor = salaryMin > 0 ? (salaryMin < 1000 ? salaryMin * 1000 : salaryMin) : 0
  let salaryValue: number | undefined
  let salaryMet = true
  let salaryNote = "Salary not listed — worth asking"

  if (job.salary) {
    // Handle both "$165k–$175k" and "$165,000–$175,000" formats
    const normalised = job.salary.replace(/k/gi, "000").replace(/\$/g, "")
    const nums = normalised.match(/[\d,]+/g)?.map((n) => parseInt(n.replace(/,/g, ""), 10)).filter((n) => n > 1000) ?? []
    if (nums.length >= 2) salaryValue = Math.round((nums[0] + nums[1]) / 2)
    else if (nums.length === 1) salaryValue = nums[0]

    if (salaryValue) {
      if (salaryFloor > 0 && salaryValue < salaryFloor) {
        salaryMet = false
        salaryNote = `Listed ~$${Math.round(salaryValue / 1000)}k, your floor is $${Math.round(salaryFloor / 1000)}k`
      } else {
        salaryNote = `Listed ~$${Math.round(salaryValue / 1000)}k`
      }
    }
  }

  // Hard-reject if salary is listed AND below floor — no point surfacing it
  if (salaryFloor > 0 && salaryValue !== undefined && !salaryMet) return null

  score += salaryMet ? 20 : 0
  breakdown.push({ label: "Compensation", met: salaryMet, note: salaryNote })

  // Work model
  let workModel: "Remote" | "Hybrid" | "On-site" = "On-site"
  if (isRemoteJob) workModel = "Remote"
  else if (descLower.includes("hybrid") || locationLower.includes("hybrid")) workModel = "Hybrid"

  const match: MatchDoc = {
    userId,
    matchId: job.sourceId,
    company: job.company,
    role: job.title,
    location: job.location,
    workModel,
    salary: job.salary ?? "Not listed",
    score,
    status: "New",
    postedAgo: formatPostedAgo(job.postedAt),
    breakdown,
    coverLetter: "",
    jobUrl: job.url,
    jobReqContent: job.description.slice(0, 3000),
    updatedAt: new Date(),
  }

  return { match, score, salaryValue }
}

// ---------------------------------------------------------------------------
// Cover letter generation
// ---------------------------------------------------------------------------

async function generateCoverLetter(
  match: MatchDoc,
  resumeText: string,
  userName: string,
  defaultCoverLetter: string
): Promise<string> {
  const hasTemplate = defaultCoverLetter.trim().length > 50

  const system = hasTemplate
    ? `You are a cover letter editor. Adapt the provided template for the specific role and company.
- Keep the candidate's voice, tone, and structure
- Replace ALL placeholders: {{company}}, {{role}}, {{name}}, [Company], [Role], [Name] with the actual values
- Tailor 1-2 sentences to reference something specific about the company or role
- Keep the same length and paragraph count
- Return only the final letter text, no subject line, no commentary`
    : `Write a concise, compelling cover letter. Three short paragraphs.
No "I am writing to express my interest." Start with a specific hook.
Return only the letter text, no subject line.`

  const prompt = hasTemplate
    ? `Adapt this cover letter for ${userName} applying to the ${match.role} role at ${match.company}.

TEMPLATE:
${defaultCoverLetter}

JOB DESCRIPTION (for tailoring):
${(match.jobReqContent ?? "").slice(0, 800)}

RESUME (for context):
${resumeText.slice(0, 400)}`
    : `Write a cover letter for ${userName} applying to ${match.role} at ${match.company}.

Job description:
${(match.jobReqContent ?? "").slice(0, 1000)}

Resume:
${resumeText.slice(0, 600)}`

  const { text } = await generateText({
    model: "openai/gpt-4.1-nano",
    system,
    prompt,
  })

  // Hard-replace any leftover placeholders the LLM missed
  return text
    .replace(/\[Company\]/gi, match.company)
    .replace(/\[Role\]/gi, match.role)
    .replace(/\[Name\]/gi, userName)
    .replace(/\{\{company\}\}/gi, match.company)
    .replace(/\{\{role\}\}/gi, match.role)
    .replace(/\{\{name\}\}/gi, userName)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function recordLastRun(db: Awaited<ReturnType<typeof getDb>>, userId: string) {
  await db.collection<AgentDoc>("agents").updateOne(
    { userId, agentId: "scraper" },
    { $set: { lastRun: new Date(), updatedAt: new Date() } },
    { upsert: true }
  )
}

function formatPostedAgo(isoDate: string): string {
  try {
    const diff = Date.now() - new Date(isoDate).getTime()
    const days = Math.floor(diff / 86_400_000)
    if (days === 0) return "Today"
    if (days === 1) return "1 day ago"
    if (days < 7) return `${days} days ago`
    if (days < 14) return "1 week ago"
    return `${Math.floor(days / 7)} weeks ago`
  } catch {
    return "Recently"
  }
}
