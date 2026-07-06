/**
 * POST /api/import-job
 *
 * Receives a job capture from the bookmarklet (page title, URL, selected text),
 * uses AI to parse out role / company / location / salary, then saves as a manual match.
 *
 * Body: { url: string, title: string, text: string, secret: string }
 */

import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { getDb } from "@/lib/mongodb"
import type { MatchDoc, DirectivesDoc } from "@/lib/actions"

const USER_ID = "default"
// Simple shared secret so random people can't post to this endpoint
const BOOKMARKLET_SECRET = process.env.BOOKMARKLET_SECRET ?? "cos-import"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url, title, text, secret } = body as {
      url: string
      title: string
      text: string
      secret: string
    }

    if (secret !== BOOKMARKLET_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 })
    }

    // Use AI to parse job details from the page content
    const prompt = `Extract job details from the following job posting. Return a JSON object with these exact keys:
- role: job title (string)
- company: company name (string)  
- location: city/state or "Remote" (string)
- workModel: one of "Remote", "Hybrid", or "On-site" (string)
- salary: salary range if mentioned, empty string if not (string)

Page title: ${title}
Page URL: ${url}
Page content (may be partial): ${text.slice(0, 3000)}

Return ONLY valid JSON, no markdown, no explanation.`

    let role = title
    let company = ""
    let location = ""
    let workModel: MatchDoc["workModel"] = "On-site"
    let salary = ""

    try {
      const { text: aiResponse } = await generateText({
        model: "openai/gpt-4o-mini",
        prompt,
        maxTokens: 200,
      })
      const parsed = JSON.parse(aiResponse.trim())
      role = parsed.role || title
      company = parsed.company || ""
      location = parsed.location || ""
      workModel = (["Remote", "Hybrid", "On-site"].includes(parsed.workModel)
        ? parsed.workModel
        : "On-site") as MatchDoc["workModel"]
      salary = parsed.salary || ""
    } catch {
      // AI parse failed — save with raw title, still useful
      role = title
    }

    const db = await getDb()

    // Load directives for resume text and user name
    const directives = await db
      .collection<DirectivesDoc>("directives")
      .findOne({ userId: USER_ID })

    const userName = directives?.name || "the applicant"
    const defaultResume = directives?.resumes?.find((r) => r.isDefault) ?? directives?.resumes?.[0]
    const resumeText = defaultResume?.text || directives?.resumeText || ""

    // Generate a cover letter using the job content
    let coverLetter = ""
    const jobContent = text.slice(0, 3000)
    if (jobContent.length > 100) {
      try {
        const { text: cl } = await generateText({
          model: "openai/gpt-4.1-nano",
          system: `You write concise, compelling cover letters. Three short paragraphs maximum.
No fluff. No "I am writing to express my interest." Start strong with a specific hook.
Return only the letter text, no subject line.`,
          prompt: `Write a cover letter for ${userName} applying to the ${role} role at ${company}.

Job description:
${jobContent}

Candidate résumé:
${resumeText.slice(0, 800)}`,
        })
        coverLetter = cl
      } catch {
        // Cover letter generation failed — save without it, user can regenerate
      }
    }

    const matchId = `manual:${Date.now()}`

    await db.collection<MatchDoc>("matches").insertOne({
      userId: USER_ID,
      matchId,
      company,
      role,
      location,
      workModel,
      salary,
      score: 0,
      status: "New",
      source: "manual",
      postedAgo: "Just added",
      breakdown: [],
      coverLetter,
      jobUrl: url,
      jobReqContent: text.slice(0, 10000),
      notes: "",
      updatedAt: new Date(),
    })

    return NextResponse.json({ ok: true, role, company, hasCoverLetter: !!coverLetter })
  } catch (err) {
    console.error("[import-job]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
