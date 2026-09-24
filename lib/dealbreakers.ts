// Returns the first dealbreaker found in any of the given fields, or undefined.
// Matches whole words/phrases case-insensitively, so "VP" doesn't hit "VPN"
// and "contract" doesn't hit "contractor" (plurals like "Engineers" still
// match) — add each other form you want excluded.
export function findDealbreaker(
  dealbreakers: string[],
  fields: (string | undefined | null)[]
): string | undefined {
  const text = fields.filter(Boolean).join("\n")
  return dealbreakers.find((d) => {
    const term = d.trim()
    if (!term) return false
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    return new RegExp(`(?<![a-z0-9])${escaped}(?:e?s)?(?![a-z0-9])`, "i").test(text)
  })
}
