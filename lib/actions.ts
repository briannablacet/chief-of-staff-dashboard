"use server"

import { getDb } from "@/lib/mongodb"
import { revalidatePath } from "next/cache"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  resumeText: string
  resumeFileName: string
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
  status: "New" | "Reviewed" | "Applied"
  postedAgo: string
  breakdown: { label: string; met: boolean; note: string }[]
  coverLetter: string
  jobUrl?: string
  jobReqContent?: string
  updatedAt: Date
}

export type AgentDoc = {
  _id?: string
  userId: string
  agentId: string
  enabled: boolean
  systemPrompt: string
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
  await db.collection<DirectivesDoc>("directives").updateOne(
    { userId: USER_ID },
    {
      $set: {
        ...data,
        userId: USER_ID,
        updatedAt: new Date(),
      },
    },
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
  // salary is stored as [low, high] array of $k values (e.g. [190, 270])
  const salaryArr = Array.isArray(directives?.salary) ? directives.salary as number[] : null
  const salaryFloor = salaryArr?.[0] ?? 190
  const remoteOnly = directives?.remoteOnly ?? false
  const name = directives?.name ?? "there"

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
          coverLetter: `Dear ${company} Hiring Team,\n\nI've spent my career building products that make a real difference — and the ${role_label(title, suffix)} role at ${company} is exactly the kind of opportunity I've been targeting.\n\nI bring deep experience in ${suffix.toLowerCase()} product work, and I'd love to bring that to ${company}'s team.\n\nBest,\n${name}`,
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

function role_label(title: string, suffix: string) {
  return `${title}, ${suffix}`
}

export async function updateMatchStatus(
  matchId: string,
  status: "New" | "Reviewed" | "Applied"
): Promise<void> {
  const db = await getDb()
  await db.collection<MatchDoc>("matches").updateOne(
    { userId: USER_ID, matchId },
    { $set: { status, updatedAt: new Date() } }
  )
  revalidatePath("/")
}
