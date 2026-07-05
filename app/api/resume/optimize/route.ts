import { generateText } from "ai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { resumeText, issues } = await req.json()

  if (!resumeText?.trim()) {
    return NextResponse.json({ error: "No resume text provided" }, { status: 400 })
  }

  const issueList = (issues as string[])?.length
    ? `\n\nSpecific issues to fix:\n${(issues as string[]).map((i: string) => `- ${i}`).join("\n")}`
    : ""

  const { text } = await generateText({
    model: "openai/gpt-4.1",
    system: `You are an expert resume writer and ATS optimization specialist. 
Your job is to rewrite resumes so they pass Applicant Tracking Systems (ATS) while remaining genuinely compelling to human readers.

Rules you must follow:
- Use plain text only. No tables, columns, or special characters.
- Use standard section headings: Summary, Experience, Education, Skills, Certifications (as applicable).
- Use simple hyphens (-) for bullet points, never special bullet characters.
- Keep all factual content accurate — do not invent jobs, skills, or credentials.
- Preserve the person's voice and all real accomplishments.
- Ensure contact information (email, phone) is in plain text at the top.
- Aim for 400–800 words for most roles.
- Return ONLY the rewritten resume text — no commentary, no preamble, no explanation.`,
    prompt: `Please rewrite and optimize the following resume for ATS compatibility.${issueList}

RESUME:
${resumeText}`,
  })

  return NextResponse.json({ optimizedText: text })
}
