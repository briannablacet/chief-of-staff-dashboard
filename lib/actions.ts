"use server"

import { getDb } from "@/lib/mongodb"
import { revalidatePath } from "next/cache"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ResumeEntry = {
  id: string        // nanoid / uuid
  label: string     // e.g. "Senior PM — Tech", "AI Lead"
  text: string      // plain text body
  fileName: string  // original file name (display only)
  isDefault: boolean
}

export type DirectivesDoc = {
  _id?: string
  userId: string
  name: string
  headline: string
  titles: string[]
  locations: string[]
  salaryMin: number
  salaryMax: number
  remoteOnly: boolean
  dreamCompanies: string[]
  dealbreakers: string[]
  // Legacy single-resume fields — kept for backwards compat
  resumeText: string
  resumeFileName: string
  // Multi-resume store
  resumes: ResumeEntry[]
  linkedinUrl: string
  defaultCoverLetter: string
  dailyMatchLimit: number
  dailyCoverLetterLimit: number
  minMatchScore: number
  updatedAt: Date
}

export type MatchDoc = {
  _id?: string
  userId: string
  matchId: string
  company: string
  role: string
  location: string
  workModel: "Remote" | "Hybrid" | "On-site"
  salary: string
  score: number
  status: "New" | "Reviewing" | "Applied" | "Interviewing" | "Offer" | "Rejected"
  appliedAt?: Date
  notes?: string
  source?: "agent" | "manual"
  postedAgo: string
  breakdown: { label: string; met: boolean; note: string }[]
  coverLetter: string
  resumeId?: string   // which ResumeEntry was used for this application
  jobUrl?: string
  jobReqContent?: string
  updatedAt: Date
}

export type CoverLetterEntry = {
  _id?: string
  userId: string
  id: string          // nanoid
  name: string        // e.g. "Linear Cover Letter", user-customizable
  text: string
  matchId?: string    // the match it was originally generated from (optional)
  updatedAt: Date
}

export type AgentDoc = {
  _id?: string
  userId: string
  agentId: string
  type?: string       // "scraper" | "scorer" | etc — used by pipeline to record lastRun
  enabled: boolean
  systemPrompt: string
  lastRun?: Date
  updatedAt: Date
}

// For now every user shares the same singleton doc — swap "default" for a
// real user ID once you add auth.
const USER_ID = "default"

// ---------------------------------------------------------------------------
// Directives
// ---------------------------------------------------------------------------

export async function getDirectives(): Promise<DirectivesDoc | null> {
  try {
    const db = await getDb()
    const doc = await db
      .collection<DirectivesDoc>("directives")
      .findOne({ userId: USER_ID })
    if (!doc) return null
    return { ...doc, _id: doc._id?.toString() }
  } catch (err) {
    console.error("[v0] getDirectives failed:", err)
    return null
  }
}

export async function saveDirectives(
  data: Omit<DirectivesDoc, "_id" | "userId" | "updatedAt">
): Promise<void> {
  const db = await getDb()
  // Destructure out _id in case the caller accidentally passed it through
  const { _id, ...safeData } = data as DirectivesDoc
  await db.collection<DirectivesDoc>("directives").updateOne(
    { userId: USER_ID },
    {
      $set: {
        ...safeData,
        userId: USER_ID,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  )
  revalidatePath("/")
}

export async function saveResumeEntry(entry: ResumeEntry): Promise<void> {
  const db = await getDb()
  const doc = await db.collection<DirectivesDoc>("directives").findOne({ userId: USER_ID })
  const existing: ResumeEntry[] = doc?.resumes ?? (doc?.resumeText ? [{ id: "default", label: "My Résumé", text: doc.resumeText, fileName: doc.resumeFileName ?? "", isDefault: true }] : [])
  const updated = existing.some((r) => r.id === entry.id)
    ? existing.map((r) => r.id === entry.id ? entry : r)
    : [...existing, entry]
  await db.collection<DirectivesDoc>("directives").updateOne(
    { userId: USER_ID },
    { $set: { resumes: updated, updatedAt: new Date() } },
    { upsert: true }
  )
  revalidatePath("/")
}

// ---------------------------------------------------------------------------
// Agent configs
// ---------------------------------------------------------------------------

export async function getAgentConfigs(): Promise<AgentDoc[]> {
  try {
    const db = await getDb()
    const docs = await db
      .collection<AgentDoc>("agents")
      .find({ userId: USER_ID })
      .toArray()
    return docs.map((d) => ({ ...d, _id: d._id?.toString() }))
  } catch (err) {
    console.error("[v0] getAgentConfigs failed:", err)
    return []
  }
}

export async function saveAgentConfig(
  agentId: string,
  patch: { enabled?: boolean; systemPrompt?: string }
): Promise<void> {
  const db = await getDb()
  await db.collection<AgentDoc>("agents").updateOne(
    { userId: USER_ID, agentId },
    {
      $set: {
        ...patch,
        userId: USER_ID,
        agentId,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  )
  revalidatePath("/")
}

export async function saveResumeForMatch(matchId: string, resumeId: string): Promise<void> {
  const db = await getDb()
  await db.collection<MatchDoc>("matches").updateOne(
    { userId: USER_ID, matchId },
    { $set: { resumeId, updatedAt: new Date() } }
  )
  revalidatePath("/")
}

export async function saveCoverLetter(matchId: string, coverLetter: string): Promise<void> {
  const db = await getDb()
  await db.collection<MatchDoc>("matches").updateOne(
    { userId: USER_ID, matchId },
    { $set: { coverLetter, updatedAt: new Date() } }
  )
  revalidatePath("/")
}

// ---------------------------------------------------------------------------
// Cover Letter Library
// ---------------------------------------------------------------------------

export async function getCoverLetters(): Promise<CoverLetterEntry[]> {
  try {
    const db = await getDb()
    const docs = await db
      .collection<CoverLetterEntry>("cover_letters")
      .find({ userId: USER_ID })
      .sort({ updatedAt: -1 })
      .toArray()
    return docs.map((d) => ({ ...d, _id: d._id?.toString() }))
  } catch {
    return []
  }
}

export async function saveCoverLetterToLibrary(
  entry: Pick<CoverLetterEntry, "id" | "name" | "text" | "matchId">
): Promise<void> {
  const db = await getDb()
  await db.collection<CoverLetterEntry>("cover_letters").updateOne(
    { userId: USER_ID, id: entry.id },
    {
      $set: {
        userId: USER_ID,
        id: entry.id,
        name: entry.name,
        text: entry.text,
        matchId: entry.matchId,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  )
  revalidatePath("/")
}

export async function deleteCoverLetterFromLibrary(id: string): Promise<void> {
  const db = await getDb()
  await db
    .collection<CoverLetterEntry>("cover_letters")
    .deleteOne({ userId: USER_ID, id })
  revalidatePath("/")
}

export async function saveJobUrl(matchId: string, jobUrl: string): Promise<void> {
  const db = await getDb()
  await db.collection<MatchDoc>("matches").updateOne(
    { userId: USER_ID, matchId },
    { $set: { jobUrl, updatedAt: new Date() } }
  )
  revalidatePath("/")
}

// ---------------------------------------------------------------------------
// Matches
// ---------------------------------------------------------------------------

export async function getMatches(): Promise<MatchDoc[]> {
  try {
    const db = await getDb()
    const count = await db
      .collection<MatchDoc>("matches")
      .countDocuments({ userId: USER_ID })

    // Seed from user's directives on first run
    if (count === 0) {
      await seedMatchesFromDirectives(db)
    }

    const docs = await db
      .collection<MatchDoc>("matches")
      .find({ userId: USER_ID })
      .sort({ score: -1 })
      .toArray()

    return docs.map((d) => ({ ...d, _id: d._id?.toString() }))
  } catch (err) {
    console.error("[v0] getMatches failed:", err)
    return []
  }
}

export async function regenerateMatches(): Promise<void> {
  const db = await getDb()
  await db.collection<MatchDoc>("matches").deleteMany({ userId: USER_ID })
  await seedMatchesFromDirectives(db)
  revalidatePath("/")
}

async function seedMatchesFromDirectives(db: Awaited<ReturnType<typeof getDb>>) {
  const directives = await db
    .collection<DirectivesDoc>("directives")
    .findOne({ userId: USER_ID })

  // Use saved titles/companies or fall back to generic defaults
  const titles = directives?.titles?.length
    ? directives.titles
    : ["Product Manager", "Senior Product Manager"]

  const dreamCompanies = directives?.dreamCompanies?.length
    ? directives.dreamCompanies
    : ["Linear", "Vercel", "Notion"]

  const location = directives?.locations?.[0] ?? "Remote (US)"
  // salary is stored as salaryMin/salaryMax fields
  const salaryFloor = directives?.salaryMin ?? 190
  const remoteOnly = directives?.remoteOnly ?? false
  const name = directives?.name || "there"
  const headline = directives?.headline ?? ""
  const defaultCoverLetter = directives?.defaultCoverLetter ?? ""

  const workModels: MatchDoc["workModel"][] = remoteOnly
    ? ["Remote"]
    : ["Remote", "Hybrid", "Remote", "Hybrid", "On-site"]

  const companySuffixes = [
    "Platform",
    "Growth",
    "Developer Experience",
    "Core Product",
    "AI",
    "Enterprise",
  ]

  const seeds: Omit<MatchDoc, "_id">[] = dreamCompanies
    .slice(0, 6)
    .flatMap((company, ci) =>
      titles.slice(0, 2).map((title, ti) => {
        const suffix = companySuffixes[(ci * 2 + ti) % companySuffixes.length]
        const score = 94 - ci * 3 - ti * 2
        const salaryLow = salaryFloor + ci * 5 + ti * 10
        const salaryHigh = salaryLow + 40
        const wm = workModels[(ci + ti) % workModels.length]
        const hoursAgo = (ci * 3 + ti + 1) * 2
        return {
          userId: USER_ID,
          matchId: `m-${ci}-${ti}`,
          company,
          role: `${title}, ${suffix}`,
          location: wm === "Remote" ? "Remote (US)" : location,
          workModel: wm,
          salary: `$${salaryLow}k – $${salaryHigh}k + equity`,
          score,
          status: "New" as const,
          postedAgo: hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.round(hoursAgo / 24)}d ago`,
          breakdown: [
            { label: "Compensation", met: salaryLow >= salaryFloor, note: `${salaryLow >= salaryFloor ? "Above" : "Below"} $${salaryFloor}k floor` },
            { label: "Work model", met: wm !== "On-site" || !remoteOnly, note: wm },
            { label: "Title match", met: true, note: `Matches target: ${title}` },
            { label: "Anti-List", met: true, note: "No dealbreakers triggered" },
            { label: "Seniority", met: score >= 88, note: score >= 88 ? "Strong fit" : "Stretch role" },
          ],
          coverLetter: buildCoverLetter({ defaultCoverLetter, name, headline, company, title, suffix }),
          jobUrl: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(title)}&company=${encodeURIComponent(company)}&f_TPR=r604800`,
          jobReqContent: `${company} is looking for a ${title}, ${suffix} to join our growing team.\n\nAbout the role:\nAs a ${title} on the ${suffix} team, you will define and drive the product strategy for a critical part of our business. You'll work closely with engineering, design, and data to ship high-impact features.\n\nResponsibilities:\n• Define the product vision and roadmap for the ${suffix} area\n• Partner with engineering and design to deliver high-quality experiences\n• Use data and customer research to prioritize the highest-impact work\n• Communicate strategy and progress to leadership and stakeholders\n• Drive cross-functional alignment across product, eng, and go-to-market teams\n\nRequirements:\n• ${score >= 90 ? "7+" : "5+"} years of product management experience\n• Strong analytical and communication skills\n• Experience working on ${suffix.toLowerCase()} products at scale\n• ${wm === "Remote" ? "Comfortable working async in a distributed team" : `Based in or willing to relocate to ${location}`}\n\nCompensation: $${salaryLow}k – $${salaryHigh}k base + equity + benefits`,
          updatedAt: new Date(),
        }
      })
    )

  if (seeds.length > 0) {
    await db.collection<MatchDoc>("matches").insertMany(seeds)
  }
}

function buildCoverLetter({
  defaultCoverLetter,
  name,
  headline,
  company,
  title,
  suffix,
}: {
  defaultCoverLetter: string
  name: string
  headline: string
  company: string
  title: string
  suffix: string
}): string {
  // [Role] = just the job title (reads naturally in a sentence)
  // [Team] = the sub-team / area (e.g. "Growth", "Platform")
  // [RoleFull] = "Senior PM, Growth" for cases where the full label is wanted

  if (defaultCoverLetter.trim()) {
    return defaultCoverLetter
      .replace(/\[Company\]/gi, company)
      .replace(/\[RoleFull\]/gi, `${title}, ${suffix}`)
      .replace(/\[Role\]/gi, title)
      .replace(/\[Team\]/gi, suffix)
      .replace(/\[Title\]/gi, title)
      .replace(/\[Name\]/gi, name)
      .replace(/\[Your Name\]/gi, name)
      .replace(/\[Headline\]/gi, headline)
  }

  // Fallback template — used when no default cover letter has been saved yet.
  const headlineLine = headline ? ` as ${headline}` : ""
  return [
    `Dear ${company} Hiring Team,`,

    `I am writing to express my strong interest in the ${title} role on your ${suffix} team.`,

    `Throughout my career${headlineLine}, I have focused on shipping products that create real, measurable impact — and everything I know about ${company} tells me this is exactly the kind of environment where that approach thrives.`,

    `The ${suffix} space is an area I know well. I bring experience defining product strategy, aligning cross-functional stakeholders, and working closely with engineering and design to move from ambiguity to execution without losing momentum. I am particularly drawn to ${company} because of the scale of the problems you are solving and the caliber of the team you have built to solve them.`,

    `I would love the opportunity to talk about how my background maps to what you are building on the ${suffix} team. Thank you for your time and consideration — I look forward to the conversation.`,

    `Best regards,\n${name}`,
  ].join("\n\n")
}

function role_label(title: string, suffix: string) {
  return `${title}, ${suffix}`
}

export async function updateMatchStatus(
  matchId: string,
  status: MatchDoc["status"] | undefined,
  patch?: { notes?: string; appliedAt?: Date }
): Promise<void> {
  const db = await getDb()
  const update: Partial<MatchDoc> = { updatedAt: new Date(), ...patch }
  if (status !== undefined) update.status = status
  await db.collection<MatchDoc>("matches").updateOne(
    { userId: USER_ID, matchId },
    { $set: update }
  )
  revalidatePath("/")
}

export async function saveManualMatch(
  data: Pick<MatchDoc, "company" | "role" | "location" | "workModel" | "salary" | "jobUrl" | "jobReqContent" | "notes">
): Promise<void> {
  const db = await getDb()
  const matchId = `manual:${Date.now()}`
  await db.collection<MatchDoc>("matches").insertOne({
    userId: USER_ID,
    matchId,
    company: data.company,
    role: data.role,
    location: data.location ?? "",
    workModel: data.workModel ?? "On-site",
    salary: data.salary ?? "",
    score: 0,
    status: "New",
    source: "manual",
    postedAgo: "Just added",
    breakdown: [],
    coverLetter: "",
    jobUrl: data.jobUrl ?? "",
    jobReqContent: data.jobReqContent ?? "",
    notes: data.notes ?? "",
    updatedAt: new Date(),
  })
  revalidatePath("/")
}

export async function deleteMatch(matchId: string): Promise<void> {
  const db = await getDb()
  await db.collection<MatchDoc>("matches").deleteOne({ userId: USER_ID, matchId })
  revalidatePath("/")
}
