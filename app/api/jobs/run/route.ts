/**
 * POST /api/jobs/run
 *
 * The full job-matching pipeline:
 *   1. Load user's directives from MongoDB
 *   2. Fetch raw jobs from Adzuna + Remotive
 *   3. Deduplicate against already-saved matches
 *   4. Score each job with GPT-4.1 (score + breakdown)
 *   5. Filter out dealbreakers and jobs below minMatchScore
 *   6. Generate a cover letter for each passing job
 *   7. Save new matches to MongoDB
 *   8. Record last-run timestamp on the agent config
 *
 * Called by: the cron route (GET /api/jobs/cron) and the "Run now" button.
 */

import { NextRequest, NextResponse } from "next/server"
import { generateText, generateObject } from "ai"
import { z } from "zod"
import { getDb } from "@/lib/mongodb"
import { fetchAdzunaJobs, fetchRemotiveJobs, type RawJob } from "@/lib/job-fetcher"
import type { DirectivesDoc, MatchDoc, AgentDoc } from "@/lib/actions"

const USER_ID = "default"

// How long the route is allowed to run (Vercel Pro = 300s, Hobby = 60s)
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

    console.log("[v0] Pipeline: directives found:", !!directives, "titles:", directives?.titles)
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
      minMatchScore = 70,
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

    console.log("[v0] Pipeline: adzuna", adzunaJobs.length, "remotive", remotiveJobs.length, "total", allJobs.length, "new", newJobs.length)

    if (!newJobs.length) {
      await recordLastRun(db)
      return NextResponse.json({ saved: 0, message: "No new jobs found" })
    }

    // ------------------------------------------------------------------
    // 4 & 5. Score each job + filter — cap at dailyMatchLimit * 3 candidates
    // ------------------------------------------------------------------
    const candidates = newJobs.slice(0, dailyMatchLimit * 3)
    const scored: MatchDoc[] = []

    for (const job of candidates) {
      try {
        const result = await scoreJob(job, directives)
        if (!result) continue

        // Filter: below score threshold
        if (result.score < minMatchScore) continue

        // Filter: dealbreakers
        const descLower = job.description.toLowerCase()
        const hitsDealbreaker = dealbreakers.some((d) =>
          d.trim() && descLower.includes(d.trim().toLowerCase())
        )
        if (hitsDealbreaker) continue

        // Filter: salary floor (if job has a salary and directives has a floor)
        if (salaryMin > 0 && result.salaryValue && result.salaryValue < salaryMin) continue

        scored.push(result.match)
      } catch (err) {

      }

      // Stop once we have enough
      if (scored.length >= dailyMatchLimit) break
    }



    console.log("[v0] Pipeline: scored matches:", scored.length)
    // ------------------------------------------------------------------
    // 6. Generate cover letters
    // ------------------------------------------------------------------
    const withLetters: MatchDoc[] = []
    for (const match of scored) {
      try {
        const letter = await generateCoverLetter(match, resumeForCoverLetter, userName)
        withLetters.push({ ...match, coverLetter: letter })
      } catch (err) {

        withLetters.push(match) // save without letter rather than skip
      }
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
    console.log("[v0] Pipeline fatal error:", err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Score a single job against user directives
// ---------------------------------------------------------------------------

const ScoreSchema = z.object({
  score: z.number().min(0).max(100).describe("Overall match score 0-100"),
  workModel: z.enum(["Remote", "Hybrid", "On-site"]),
  salaryEstimate: z.string().optional().describe("Salary range if determinable"),
  salaryValue: z.number().optional().describe("Midpoint salary number for filtering"),
  breakdown: z.array(z.object({
    label: z.string(),
    met: z.boolean(),
    note: z.string(),
  })).describe("3-6 scored criteria"),
})

async function scoreJob(
  job: RawJob,
  directives: DirectivesDoc
): Promise<{ match: MatchDoc; score: number; salaryValue?: number } | null> {
  const { titles, locations, remoteOnly, salaryMin, salaryMax, dealbreakers, name } = directives

  const prompt = `You are an expert job-match evaluator. Score how well this job matches the candidate's preferences.

CANDIDATE PREFERENCES:
- Target titles: ${titles.join(", ")}
- Preferred locations: ${locations.length ? locations.join(", ") : "any"}
- Remote only: ${remoteOnly}
- Salary range: ${salaryMin ? `$${salaryMin.toLocaleString()}` : "no floor"} – ${salaryMax ? `$${salaryMax.toLocaleString()}` : "no ceiling"}
- Dealbreakers: ${dealbreakers.length ? dealbreakers.join(", ") : "none"}

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Salary: ${job.salary ?? "not listed"}
Description:
${job.description.slice(0, 1500)}

Score this match 0-100. Be strict — 70+ means genuinely good fit. Provide 3-5 specific breakdown criteria.`

  const { object } = await generateObject({
    model: "openai/gpt-4.1-mini",
    schema: ScoreSchema,
    prompt,
  })

  const postedAgo = formatPostedAgo(job.postedAt)
  const matchId = job.sourceId

  const match: MatchDoc = {
    userId: USER_ID,
    matchId,
    company: job.company,
    role: job.title,
    location: job.location,
    workModel: object.workModel,
    salary: object.salaryEstimate ?? job.salary ?? "Not listed",
    score: object.score,
    status: "New",
    postedAgo,
    breakdown: object.breakdown,
    coverLetter: "",
    jobUrl: job.url,
    jobReqContent: job.description.slice(0, 3000),
    updatedAt: new Date(),
  }

  return { match, score: object.score, salaryValue: object.salaryValue }
}

// ---------------------------------------------------------------------------
// Generate cover letter for a matched job
// ---------------------------------------------------------------------------

async function generateCoverLetter(
  match: MatchDoc,
  resumeText: string,
  userName: string
): Promise<string> {
  const { text } = await generateText({
    model: "openai/gpt-4.1-mini",
    system: `You write concise, compelling cover letters. Three short paragraphs maximum. 
No fluff. No "I am writing to express my interest." Start strong with a specific hook. 
Return only the letter text — no subject line, no "Dear Hiring Manager" unless it fits naturally.`,
    prompt: `Write a cover letter for ${userName} applying to the ${match.role} role at ${match.company}.

Job description summary:
${(match.jobReqContent ?? "").slice(0, 800)}

Candidate résumé summary:
${resumeText.slice(0, 800)}`,
  })
  return text
}

// ---------------------------------------------------------------------------
// Record last run timestamp on the scraper agent config
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
