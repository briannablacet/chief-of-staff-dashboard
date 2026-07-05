import type { MatchDoc } from "@/lib/actions"

export type AtsCheckResult = {
  id: string
  label: string
  pass: boolean
  detail: string // shown when failing (tip to fix) or passing (confirmation)
  severity: "error" | "warning" | "info"
}

export type AtsReport = {
  score: number // 0–100
  checks: AtsCheckResult[]
}

// Common ATS-unfriendly characters / patterns
const TABLE_CHARS = /[|┃│╎┆┊┇┋]/
const SPECIAL_BULLETS = /[•◦▪▸►▶●◆◉]/g
const UNFILLED_PLACEHOLDER = /\[(Company|Role|Title|Name|Your Name|Headline|Team|RoleFull|Hiring Manager)\]/gi

// Typical ATS keyword extraction — pull meaningful words from a string
function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    "a","an","the","and","or","but","in","on","at","to","for","of","with","by",
    "is","are","was","were","be","been","have","has","had","will","would","could",
    "should","may","might","i","my","we","our","you","your","they","their","it",
    "this","that","these","those","as","if","so","do","did","does","not","no",
    "from","into","than","then","when","who","how","what","which","there","here",
    "am","its","we","us",
  ])
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w))
  )
}

export function runAtsChecks(coverLetter: string, match: MatchDoc): AtsReport {
  const text = coverLetter.trim()
  const wordCount = text.split(/\s+/).filter(Boolean).length
  const charCount = text.length
  const checks: AtsCheckResult[] = []

  // 1. Not empty
  checks.push({
    id: "not-empty",
    label: "Cover letter has content",
    pass: charCount > 50,
    detail: charCount > 50
      ? `${wordCount} words — good length.`
      : "Cover letter is too short or empty.",
    severity: "error",
  })

  // 2. No unfilled placeholders
  const unfilledMatches = text.match(UNFILLED_PLACEHOLDER)
  checks.push({
    id: "no-placeholders",
    label: "No unfilled placeholders",
    pass: !unfilledMatches,
    detail: unfilledMatches
      ? `Still contains: ${[...new Set(unfilledMatches)].join(", ")} — these won't be substituted.`
      : "All placeholders have been filled.",
    severity: "error",
  })

  // 3. Company name present
  const companyLower = match.company.toLowerCase()
  const textLower = text.toLowerCase()
  checks.push({
    id: "company-name",
    label: `Mentions ${match.company}`,
    pass: textLower.includes(companyLower),
    detail: textLower.includes(companyLower)
      ? `${match.company} is mentioned — personalisation detected.`
      : `Add the company name "${match.company}" to personalise the letter.`,
    severity: "warning",
  })

  // 4. Role / job title present
  const roleWords = match.role.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  const roleMentioned = roleWords.some((w) => textLower.includes(w))
  checks.push({
    id: "role-mentioned",
    label: "Mentions the job title",
    pass: roleMentioned,
    detail: roleMentioned
      ? "Job title is referenced in the letter."
      : `Mention the role title ("${match.role}") so ATS systems can match it.`,
    severity: "warning",
  })

  // 5. No table characters (ATS systems can't parse tables)
  const hasTableChars = TABLE_CHARS.test(text)
  checks.push({
    id: "no-tables",
    label: "No table characters",
    pass: !hasTableChars,
    detail: hasTableChars
      ? "Contains table/pipe characters that can confuse ATS parsers — use plain text formatting instead."
      : "No table characters detected.",
    severity: "error",
  })

  // 6. Has a proper greeting
  const hasGreeting = /^(dear|hello|hi|to whom)/i.test(text)
  checks.push({
    id: "greeting",
    label: "Opens with a greeting",
    pass: hasGreeting,
    detail: hasGreeting
      ? "Starts with a proper greeting."
      : 'Begin with a greeting like "Dear [Company] Hiring Team," for a professional tone.',
    severity: "warning",
  })

  // 7. Ends with a call to action / sign-off
  const lastPara = text.split(/\n+/).filter(Boolean).pop()?.toLowerCase() ?? ""
  const hasSignoff = /(sincerely|best|regards|thank you|look forward|warmly|yours)/i.test(lastPara)
  checks.push({
    id: "signoff",
    label: "Ends with a sign-off",
    pass: hasSignoff,
    detail: hasSignoff
      ? "Closes with a professional sign-off."
      : 'Add a closing like "Thank you for your consideration. Best regards, [Name]".',
    severity: "warning",
  })

  // 8. Keyword overlap with job description (if available)
  if (match.jobReqContent) {
    const jdKeywords = extractKeywords(match.jobReqContent)
    const clKeywords = extractKeywords(text)
    const overlap = [...jdKeywords].filter((k) => clKeywords.has(k))
    const overlapPct = jdKeywords.size > 0 ? Math.round((overlap.length / jdKeywords.size) * 100) : 0
    const pass = overlapPct >= 15
    checks.push({
      id: "keyword-overlap",
      label: "Keyword alignment with job description",
      pass,
      detail: pass
        ? `${overlapPct}% keyword overlap with the job description — good alignment.`
        : `Only ${overlapPct}% keyword overlap. Mirror more language from the job description to improve ATS scoring.`,
      severity: "info",
    })
  }

  // 9. Reasonable length (50–500 words is ATS-friendly)
  const lengthOk = wordCount >= 50 && wordCount <= 500
  checks.push({
    id: "length",
    label: "Recommended length (50–500 words)",
    pass: lengthOk,
    detail: lengthOk
      ? `${wordCount} words — within the ideal range.`
      : wordCount < 50
        ? `Too short at ${wordCount} words — aim for at least 50.`
        : `At ${wordCount} words this may be trimmed by ATS systems — aim for under 500.`,
    severity: "info",
  })

  // 10. No special bullet characters (ATS may render them as garbage)
  const bulletCount = (text.match(SPECIAL_BULLETS) ?? []).length
  checks.push({
    id: "no-special-bullets",
    label: "No special bullet characters",
    pass: bulletCount === 0,
    detail: bulletCount === 0
      ? "No special bullet characters detected."
      : `Contains ${bulletCount} special bullet character(s). Use a plain hyphen (-) or asterisk (*) instead.`,
    severity: "info",
  })

  // Score: errors are worth more than warnings/info
  const weights = { error: 3, warning: 2, info: 1 }
  const totalWeight = checks.reduce((sum, c) => sum + weights[c.severity], 0)
  const passedWeight = checks.filter((c) => c.pass).reduce((sum, c) => sum + weights[c.severity], 0)
  const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 100

  return { score, checks }
}
