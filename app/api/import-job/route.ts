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

// Simple shared secret so random people can't post to this endpoint
const BOOKMARKLET_SECRET = process.env.BOOKMARKLET_SECRET ?? "cos-import"

export const maxDuration = 60

// CORS headers — required because the bookmarklet fires fetch() from third-party
// pages (linkedin.com, greenhouse.io, etc.) cross-origin to this endpoint.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

// Handle preflight OPTIONS request sent by browsers before cross-origin POST
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS })
    }

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400, headers: CORS_HEADERS })
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
    } catch (parseErr) {
      console.error("[import-job] AI parse failed:", parseErr)
      role = title
    }

    const db = await getDb()

    // Resolve the real userId from directives — bookmarklet can't carry a session
    // cookie cross-origin, so we look up the most recently updated directives doc.
    const directives = await db
      .collection<DirectivesDoc>("directives")
      .findOne({ userId: { $ne: "default" } }, { sort: { updatedAt: -1 } })

    const USER_ID = directives?.userId ?? "default"

    const userName = directives?.name || "the applicant"
    const defaultResume = directives?.resumes?.find((r) => r.isDefault) ?? directives?.resumes?.[0]
    const resumeText = defaultResume?.text || directives?.resumeText || ""
    const defaultCoverLetter = directives?.defaultCoverLetter || ""
    const hasTemplate = defaultCoverLetter.trim().length > 50

    // Generate a cover letter using the job content
    let coverLetter = ""
    const jobContent = text.slice(0, 3000)
    if (jobContent.length > 100) {
      try {
        const system = hasTemplate
          ? `You are a cover letter editor. Adapt the provided template for the specific role and company.
Rules:
- Keep the candidate's voice, tone, and structure from the template
- Replace any placeholder variables like {{company}}, {{role}}, {{name}}, [Company], [Role] with the actual values
- Tailor 1-2 sentences to reference something specific about the company or role
- Do not add new paragraphs or change the overall length
- Return only the final letter text, no subject line, no commentary`
          : `You write concise, compelling cover letters. Three short paragraphs maximum.
No fluff. No "I am writing to express my interest." Start strong with a specific hook.
Return only the letter text, no subject line.`

        const prompt = hasTemplate
          ? `Adapt this cover letter template for ${userName} applying to the ${role} role at ${company}.

Template to adapt:
${defaultCoverLetter}

Job description (use for tailoring):
${jobContent.slice(0, 600)}

Candidate résumé (for context):
${resumeText.slice(0, 400)}`
          : `Write a cover letter for ${userName} applying to the ${role} role at ${company}.

Job description:
${jobContent}

Candidate résumé:
${resumeText.slice(0, 800)}`

        const { text: cl } = await generateText({
          model: "openai/gpt-4.1-nano",
          system,
          prompt,
        })
        // Guaranteed literal replacement of any remaining placeholders
        coverLetter = cl
          .replace(/\[Company\]/gi, company)
          .replace(/\[Role\]/gi, role)
          .replace(/\[Name\]/gi, userName)
          .replace(/\{\{company\}\}/gi, company)
          .replace(/\{\{role\}\}/gi, role)
          .replace(/\{\{name\}\}/gi, userName)
      } catch (clErr) {
        console.error("[import-job] Cover letter generation failed:", clErr)
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

    return NextResponse.json({ ok: true, role, company, hasCoverLetter: !!coverLetter }, { headers: CORS_HEADERS })
  } catch (err) {
    console.error("[import-job]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: CORS_HEADERS })
  }
}
