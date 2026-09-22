import type { MatchDoc } from "@/lib/actions"

// SWR fetcher for /api/matches. Throws on a non-OK or non-array response so SWR
// treats it as an error and keeps the last good data — otherwise an error body
// like { error: "Unauthorized" } becomes `matches` and every .filter() crashes.
export async function fetchMatches(url: string): Promise<MatchDoc[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error(`GET ${url} returned a non-array body`)
  return data
}
