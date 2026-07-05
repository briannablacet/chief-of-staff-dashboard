/**
 * POST /api/jobs/run
 *
 * The full job-matching pipeline:
 *   1. Load user's directives from MongoDB
 *   2. Fetch raw jobs from Adzuna + Remotive
 *   3. Deduplicate against already-saved matches
 *   4. Score each job with deterministic keyword matching (fast, free, no rate limits)
 *   5. Filter out dealbreakers and jobs below minMatchScore
 *   6. Generate a cover letter for each passing job (single LLM call per match)
 *   7. Save new matches to MongoDB
 *   8. Record last-run timestamp on the agent config
 *
 * Called by: the cron route (GET /api/jobs/cron) and the "Run now" button.
 */

import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { getDb } from "@/lib/mongodb"
import { fetchAdzunaJobs, fetchRemotiveJobs, type RawJob } from "@/lib/job-fetcher"
import type { DirectivesDoc, MatchDoc, AgentDoc } from "@/lib/actions"

const USER_ID = "default"

export const maxDuration = 300

export async function POST(_req: NextRequest) {
  try {
    const db = await getDb()

    // ------------------------------------------------------------------
    // 1. Load directives
    // ------------------------------------------------------------------
    const directives = await db
      .collection<DirectivesDoc>("directives")
      .findOne({ userId: USER_ID })

    if (!directives) {
      return NextResponse.json({ error: "No directives configured" }, { status: 400 })
    }

    const {
      titles = [],
      locations = [],
      remoteOnly = false,
      salaryMin = 0,
      dealbreakers = [],
      dailyMatchLimit = 10,
      minMatchScore = 60,
      resumeText = "",
      resumes = [],
      name: userName = "the applicant",
    } = directives

    if (!titles.length) {
      return NextResponse.json({ error: "No target titles configured" }, { status: 400 })
    }

    const defaultResume = resumes.find((r) => r.isDefault) ?? resumes[0]
    const resumeForCoverLetter = defaultResume?.text || resumeText

    // ------------------------------------------------------------------
    // 2. Load existing match sourceIds to deduplicate
    // ------------------------------------------------------------------
    const existing = await db
      .collection<MatchDoc>("matches")
      .find({ userId: USER_ID }, { projection: { matchId: 1 } })
      .toArray()
    const existingIds = new Set(existing.map((m) => m.matchId))

    // ------------------------------------------------------------------
    // 3. Fetch jobs
    // ------------------------------------------------------------------
    const [adzunaJobs, remotiveJobs] = await Promise.all([
      fetchAdzunaJobs(titles, locations, remoteOnly, 40),
      fetchRemotiveJobs(titles, 30),
    ])

    const allJobs: RawJob[] = [...adzunaJobs, ...remotiveJobs]
    const newJobs = allJobs.filter((j) => !existingIds.has(j.sourceId))

    if (!newJobs.length) {
      await recordLastRun(db)
      return NextResponse.json({ saved: 0, message: "No new jobs found" })
    }

    // ------------------------------------------------------------------
    // 4 & 5. Score with keyword matching + filter
    // ------------------------------------------------------------------
    const scored: { match: MatchDoc; score: number }[] = []

    for (const job of newJobs.slice(0, dailyMatchLimit * 4)) {
      const result = scoreJobKeywords(job, directives)
      if (!result) continue
      if (result.score < minMatchScore) continue

      // Dealbreaker filter
      const descLower = job.description.toLowerCase()
      const hitsDealbreaker = dealbreakers.some(
        (d) => d.trim() && descLower.includes(d.trim().toLowerCase())
      )
      if (hitsDealbreaker) continue

      // Salary floor filter
      if (salaryMin > 0 && result.salaryValue && result.salaryValue < salaryMin) continue

      scored.push(result)
      if (scored.length >= dailyMatchLimit) break
    }

    if (!scored.length) {
      await recordLastRun(db)
      return NextResponse.json({ saved: 0, message: "No matches above score threshold" })
    }

    // ------------------------------------------------------------------
    // 6. Generate cover letters (one LLM call per match, sequentially)
    // ------------------------------------------------------------------
    const withLetters: MatchDoc[] = []
    for (const { match } of scored) {
      try {
        const letter = await generateCoverLetter(match, resumeForCoverLetter, userName)
        withLetters.push({ ...match, coverLetter: letter })
      } catch {
        withLetters.push(match) // save without letter rather than skip entirely
      }
      // Respect rate limits between cover letter calls
      await new Promise((r) => setTimeout(r, 1500))
    }

    // ------------------------------------------------------------------
    // 7. Save to MongoDB
    // ------------------------------------------------------------------
    if (withLetters.length) {
      await db.collection<MatchDoc>("matches").insertMany(withLetters)
    }

    await recordLastRun(db)

    return NextResponse.json({
      saved: withLetters.length,
      total: allJobs.length,
      newFound: newJobs.length,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Deterministic keyword scoring — no LLM, no rate limits
// ---------------------------------------------------------------------------

function scoreJobKeywords(
  job: RawJob,
  directives: DirectivesDoc
): { match: MatchDoc; score: number; salaryValue?: number } | null {
  const { titles, locations, remoteOnly, salaryMin, salaryMax } = directives
  const titleLower = job.title.toLowerCase()
  const descLower = job.description.toLowerCase()
  const locationLower = (job.location ?? "").toLowerCase()

  const breakdown: { label: string; met: boolean; note: string }[] = []
  let score = 0

  // ── Title match (40 pts) ───────────────────────────────────────────────────
  const titleKeywords = titles.flatMap((t) =>
    t.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  )
  const uniqueKeywords = [...new Set(titleKeywords)]
  const matchedKeywords = uniqueKeywords.filter(
    (kw) => titleLower.includes(kw) || descLower.includes(kw)
  )
  const titleScore = Math.min(40, Math.round((matchedKeywords.length / Math.max(uniqueKeywords.length, 1)) * 40))
  score += titleScore
  const titleMet = titleScore >= 20
  breakdown.push({
    label: "Title alignment",
    met: titleMet,
    note: titleMet
      ? `Matched keywords: ${matchedKeywords.slice(0, 3).join(", ")}`
      : `Low title match — looking for: ${titles.slice(0, 2).join(", ")}`,
  })

  // ── Location / remote (20 pts) ────────────────────────────────────────────
  const isRemoteJob =
    locationLower.includes("remote") ||
    descLower.includes("fully remote") ||
    descLower.includes("work from home") ||
    descLower.includes("100% remote")

  if (remoteOnly) {
    const met = isRemoteJob
    score += met ? 20 : 0
    breakdown.push({
      label: "Remote work",
      met,
      note: met ? "Position is remote" : "Position may not be remote",
    })
  } else if (locations.length) {
    const locationMatch = locations.some(
      (loc) =>
        locationLower.includes(loc.toLowerCase()) ||
        descLower.includes(loc.toLowerCase())
    )
    const met = locationMatch || isRemoteJob
    score += met ? 20 : 10 // partial credit if no location listed
    breakdown.push({
      label: "Location",
      met,
      note: met
        ? isRemoteJob ? "Remote position" : `Matches ${locations[0]}`
        : `Looking for ${locations.slice(0, 2).join(" or ")}`,
    })
  } else {
    score += 15 // no location preference = neutral
    breakdown.push({
      label: "Location",
      met: true,
      note: "No location preference set",
    })
  }

  // ── Seniority match (20 pts) ──────────────────────────────────────────────
  const seniorityTerms = ["director", "senior", "lead", "head of", "principal", "manager", "vp", "vice president"]
  const targetSeniority = titles.some((t) =>
    seniorityTerms.some((s) => t.toLowerCase().includes(s))
  )
  const jobHasSeniority = seniorityTerms.some((s) => titleLower.includes(s))
  const seniorityMet = !targetSeniority || jobHasSeniority
  score += seniorityMet ? 20 : 5
  breakdown.push({
    label: "Seniority level",
    met: seniorityMet,
    note: seniorityMet
      ? "Seniority level aligns"
      : "Job may be below target seniority",
  })

  // ── Salary (20 pts) ───────────────────────────────────────────────────────
  let salaryValue: number | undefined
  let salaryMet = true
  let salaryNote = "Salary not listed"

  if (job.salary) {
    const nums = job.salary.match(/[\d,]+/g)?.map((n) => parseInt(n.replace(/,/g, ""))) ?? []
    if (nums.length >= 2) salaryValue = Math.round((nums[0] + nums[1]) / 2)
    else if (nums.length === 1) salaryValue = nums[0]

    if (salaryValue) {
      if (salaryMin > 0 && salaryValue < salaryMin) {
        salaryMet = false
        salaryNote = `Listed ~$${(salaryValue / 1000).toFixed(0)}k, floor is $${(salaryMin / 1000).toFixed(0)}k`
      } else if (salaryMax > 0 && salaryValue > salaryMax * 1.3) {
        salaryNote = `Listed ~$${(salaryValue / 1000).toFixed(0)}k — above your ceiling`
        salaryMet = true // still apply — they may negotiate
      } else {
        salaryNote = `Listed ~$${(salaryValue / 1000).toFixed(0)}k`
        salaryMet = true
      }
    }
  } else {
    salaryNote = "Salary not listed — worth asking"
  }
  score += salaryMet ? 20 : 5
  breakdown.push({ label: "Compensation", met: salaryMet, note: salaryNote })

  // ── Detect work model ─────────────────────────────────────────────────────
  let workModel: "Remote" | "Hybrid" | "On-site" = "On-site"
  if (isRemoteJob) workModel = "Remote"
  else if (descLower.includes("hybrid") || locationLower.includes("hybrid")) workModel = "Hybrid"

  const matchId = job.sourceId
  const match: MatchDoc = {
    userId: USER_ID,
    matchId,
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
// Generate cover letter — one LLM call per match
// ---------------------------------------------------------------------------

async function generateCoverLetter(
  match: MatchDoc,
  resumeText: string,
  userName: string
): Promise<string> {
  const { text } = await generateText({
    model: "openai/gpt-4.1-nano",
    system: `You write concise, compelling cover letters. Three short paragraphs maximum. 
No fluff. No "I am writing to express my interest." Start strong with a specific hook.
Return only the letter text, no subject line.`,
    prompt: `Write a cover letter for ${userName} applying to the ${match.role} role at ${match.company}.

Job description:
${(match.jobReqContent ?? "").slice(0, 800)}

Candidate résumé:
${resumeText.slice(0, 800)}`,
  })
  return text
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function recordLastRun(db: Awaited<ReturnType<typeof getDb>>) {
  await db.collection<AgentDoc>("agents").updateOne(
    { userId: USER_ID, agentId: "scraper" },
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
