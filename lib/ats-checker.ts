import type { MatchDoc } from "@/lib/actions"

export type AtsCheckResult = {
  id: string
  label: string
  pass: boolean
  detail: string
  severity: "error" | "warning" | "info"
}

export type AtsReport = {
  score: number // 0–100
  checks: AtsCheckResult[]
}

const TABLE_CHARS = /[|┃│╎┆┊┇┋]/
const SPECIAL_BULLETS = /[•◦▪▸►▶●◆◉]/g
const UNFILLED_PLACEHOLDER = /\[(Company|Role|Title|Name|Your Name|Headline|Team|RoleFull|Hiring Manager)\]/gi

// Standard ATS-readable section headings
const STANDARD_HEADINGS = [
  "experience", "work experience", "education", "skills", "summary",
  "objective", "certifications", "projects", "awards", "publications",
  "volunteer", "languages", "profile",
]

// Extract meaningful keywords from a block of text
function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    "a","an","the","and","or","but","in","on","at","to","for","of","with","by",
    "is","are","was","were","be","been","have","has","had","will","would","could",
    "should","may","might","i","my","we","our","you","your","they","their","it",
    "this","that","these","those","as","if","so","do","did","does","not","no",
    "from","into","than","then","when","who","how","what","which","there","here",
    "am","its","us",
  ])
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w))
  )
}

/**
 * Run ATS checks against a resume without a job description.
 * Skips keyword-overlap and role-mention checks.
 */
export function runResumeAtsChecks(resume: string): AtsReport {
  const stub = {
    matchId: "", userId: "", company: "", role: "", location: "",
    workModel: "Remote" as const, salary: "", score: 0, status: "New" as const,
    postedAgo: "", breakdown: [], coverLetter: "", updatedAt: new Date(),
  }
  const report = runAtsChecks(resume, stub)
  // Filter out job-specific checks that require a real match
  return {
    ...report,
    checks: report.checks.filter((c) => c.id !== "keyword-overlap" && c.id !== "role-mentioned"),
  }
}

export function runAtsChecks(resume: string, match: MatchDoc): AtsReport {
  const text = resume.trim()
  const textLower = text.toLowerCase()
  const wordCount = text.split(/\s+/).filter(Boolean).length
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean)
  const checks: AtsCheckResult[] = []

  // 1. Resume has content
  checks.push({
    id: "not-empty",
    label: "Résumé has content",
    pass: wordCount >= 100,
    detail: wordCount >= 100
      ? `${wordCount} words detected.`
      : wordCount === 0
        ? "No résumé text found — paste your résumé in the Résumés page."
        : `Only ${wordCount} words found — a full résumé should have at least 100.`,
    severity: "error",
  })

  // 2. No unfilled placeholders
  const unfilledMatches = text.match(UNFILLED_PLACEHOLDER)
  checks.push({
    id: "no-placeholders",
    label: "No unfilled placeholders",
    pass: !unfilledMatches,
    detail: unfilledMatches
      ? `Still contains: ${[...new Set(unfilledMatches)].join(", ")}.`
      : "No unfilled placeholders found.",
    severity: "error",
  })

  // 3. No table characters (ATS parsers choke on tables)
  const hasTableChars = TABLE_CHARS.test(text)
  checks.push({
    id: "no-tables",
    label: "No table or column formatting",
    pass: !hasTableChars,
    detail: hasTableChars
      ? "Contains table/pipe characters. ATS systems can't parse columns — use a single-column plain text format."
      : "No table formatting detected.",
    severity: "error",
  })

  // 4. No special bullet characters
  const bulletCount = (text.match(SPECIAL_BULLETS) ?? []).length
  checks.push({
    id: "no-special-bullets",
    label: "Uses plain bullet characters",
    pass: bulletCount === 0,
    detail: bulletCount === 0
      ? "No special bullet characters found."
      : `Contains ${bulletCount} special bullet character(s) (•, ►, ▪, etc.). Use a plain hyphen (-) or asterisk (*) instead — special characters may render as garbage in ATS systems.`,
    severity: "warning",
  })

  // 5. Has standard section headings
  const foundHeadings = STANDARD_HEADINGS.filter((h) => textLower.includes(h))
  const hasHeadings = foundHeadings.length >= 2
  checks.push({
    id: "standard-headings",
    label: "Uses standard section headings",
    pass: hasHeadings,
    detail: hasHeadings
      ? `Found standard sections: ${foundHeadings.slice(0, 4).join(", ")}.`
      : "Could not detect standard section headings like Experience, Education, or Skills. ATS systems use these to categorise your résumé.",
    severity: "error",
  })

  // 6. Contains contact info (email or phone)
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)
  const hasPhone = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)
  const hasContact = hasEmail || hasPhone
  checks.push({
    id: "contact-info",
    label: "Contains contact information",
    pass: hasContact,
    detail: hasContact
      ? `Contact info detected (${hasEmail ? "email" : ""}${hasEmail && hasPhone ? " & " : ""}${hasPhone ? "phone" : ""}).`
      : "No email address or phone number detected. Make sure your contact info is in plain text, not a header/image.",
    severity: "error",
  })

  // 7. Keyword overlap with job description
  if (match.jobReqContent) {
    const jdKeywords = extractKeywords(match.jobReqContent)
    const resumeKeywords = extractKeywords(text)
    const overlap = [...jdKeywords].filter((k) => resumeKeywords.has(k))
    const overlapPct = jdKeywords.size > 0 ? Math.round((overlap.length / jdKeywords.size) * 100) : 0
    const pass = overlapPct >= 20
    checks.push({
      id: "keyword-overlap",
      label: "Keyword match with job description",
      pass,
      detail: pass
        ? `${overlapPct}% keyword overlap with the job description — strong alignment.`
        : `${overlapPct}% keyword overlap. Mirror more language from the job description to pass ATS filters. Missing terms may include: ${
            [...jdKeywords].filter((k) => !resumeKeywords.has(k)).slice(0, 5).join(", ")
          }.`,
      severity: "error",
    })
  }

  // 8. Role/job title appears in resume
  const roleWords = match.role.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  const roleMentioned = roleWords.some((w) => textLower.includes(w))
  checks.push({
    id: "role-mentioned",
    label: "Job title language present",
    pass: roleMentioned,
    detail: roleMentioned
      ? `Résumé references language from the target role "${match.role}".`
      : `Consider including language from the target role title "${match.role}" in your summary or experience sections.`,
    severity: "warning",
  })

  // 9. Reasonable length (400–1200 words for 1-2 pages)
  const lengthOk = wordCount >= 200 && wordCount <= 1200
  checks.push({
    id: "length",
    label: "Appropriate résumé length (200–1,200 words)",
    pass: lengthOk,
    detail: lengthOk
      ? `${wordCount} words — within the ideal range for ATS parsing.`
      : wordCount < 200
        ? `At ${wordCount} words, the résumé may be too sparse. Aim for at least 200.`
        : `At ${wordCount} words this is quite long. ATS systems handle 1–2 page résumés best.`,
    severity: "info",
  })

  // 10. No images or graphics (heuristic: very low word density per line suggests columns/graphics)
  const avgWordsPerLine = lines.length > 0 ? wordCount / lines.length : 0
  const likelyHasGraphics = avgWordsPerLine < 2 && wordCount > 50
  checks.push({
    id: "no-graphics",
    label: "No graphics or image-heavy layout detected",
    pass: !likelyHasGraphics,
    detail: !likelyHasGraphics
      ? "Text density looks consistent with a plain-text résumé."
      : "Very short lines detected — if your résumé uses icons, photos, or a graphical layout, ATS systems may skip large portions. Use a clean single-column text format.",
    severity: "warning",
  })

  // Score: weight by severity
  const weights = { error: 3, warning: 2, info: 1 }
  const totalWeight = checks.reduce((sum, c) => sum + weights[c.severity], 0)
  const passedWeight = checks.filter((c) => c.pass).reduce((sum, c) => sum + weights[c.severity], 0)
  const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 100

  return { score, checks }
}
