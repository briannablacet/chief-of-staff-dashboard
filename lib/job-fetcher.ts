/**
 * lib/job-fetcher.ts
 *
 * Fetches raw job listings from two sources:
 *   1. Adzuna  — broad coverage, requires free API key (developer.adzuna.com)
 *   2. Remotive — remote-only fallback, no auth needed
 *
 * Returns a normalised RawJob array that the pipeline can score.
 */

export type RawJob = {
  sourceId: string          // "{source}:{externalId}" — used for deduplication
  source: "adzuna" | "remotive"
  title: string
  company: string
  location: string
  description: string       // plain text, may be HTML-stripped
  url: string
  postedAt: string          // ISO date string
  salary?: string
}

// ---------------------------------------------------------------------------
// Adzuna
// ---------------------------------------------------------------------------

type AdzunaJob = {
  id: string
  title: string
  company: { display_name: string }
  location: { display_name: string }
  description: string
  redirect_url: string
  created: string
  salary_min?: number
  salary_max?: number
}

export async function fetchAdzunaJobs(
  titles: string[],
  locations: string[],
  remoteOnly: boolean,
  maxResults = 50
): Promise<RawJob[]> {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) {
    console.log("[v0] Adzuna credentials missing — skipping Adzuna fetch")
    return []
  }

  const jobs: RawJob[] = []
  const perTitle = Math.ceil(maxResults / Math.max(titles.length, 1))

  for (const title of titles.slice(0, 5)) {
    try {
      const query = encodeURIComponent(remoteOnly ? `${title} remote` : title)
      const where = locations[0] ? `&where=${encodeURIComponent(locations[0])}` : ""
      const url =
        `https://api.adzuna.com/v1/api/jobs/us/search/1` +
        `?app_id=${appId}&app_key=${appKey}` +
        `&results_per_page=${perTitle}` +
        `&what=${query}${where}` +
        `&content-type=application/json`

      const res = await fetch(url, { next: { revalidate: 0 } })
      if (!res.ok) {
        console.log("[v0] Adzuna fetch failed:", res.status, await res.text())
        continue
      }
      const data = await res.json() as { results: AdzunaJob[] }
      for (const j of data.results ?? []) {
        jobs.push({
          sourceId: `adzuna:${j.id}`,
          source: "adzuna",
          title: j.title,
          company: j.company.display_name,
          location: j.location.display_name,
          description: stripHtml(j.description),
          url: j.redirect_url,
          postedAt: j.created,
          salary: j.salary_min && j.salary_max
            ? `$${Math.round(j.salary_min / 1000)}k–$${Math.round(j.salary_max / 1000)}k`
            : undefined,
        })
      }
    } catch (err) {
      console.log("[v0] Adzuna error for title", title, err)
    }
  }

  return jobs
}

// ---------------------------------------------------------------------------
// Remotive (free, no auth)
// ---------------------------------------------------------------------------

type RemotiveJob = {
  id: number
  url: string
  title: string
  company_name: string
  candidate_required_location: string
  description: string
  publication_date: string
  salary?: string
}

export async function fetchRemotiveJobs(
  titles: string[],
  maxResults = 30
): Promise<RawJob[]> {
  const jobs: RawJob[] = []
  const seen = new Set<string>()

  // Build search queries: use the full title AND broad keyword extracts
  // so niche titles like "AI Enablement Manager" also find "AI Manager" results
  const queries = new Set<string>()
  for (const title of titles.slice(0, 4)) {
    queries.add(title) // full phrase
    const words = title.split(/\s+/).filter((w) => w.length > 3)
    if (words.length > 1) queries.add(words.slice(0, 2).join(" ")) // first 2 words
  }

  for (const query of Array.from(queries).slice(0, 5)) {
    try {
      const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=15`
      const res = await fetch(url, { next: { revalidate: 0 } })
      if (!res.ok) continue
      const data = await res.json() as { jobs: RemotiveJob[] }
      for (const j of (data.jobs ?? []).slice(0, Math.ceil(maxResults / 3))) {
        if (seen.has(String(j.id))) continue
        seen.add(String(j.id))
        jobs.push({
          sourceId: `remotive:${j.id}`,
          source: "remotive",
          title: j.title,
          company: j.company_name,
          location: j.candidate_required_location || "Remote",
          description: stripHtml(j.description).slice(0, 2000),
          url: j.url,
          postedAt: j.publication_date,
          salary: j.salary || undefined,
        })
      }
    } catch (err) {
      console.log("[v0] Remotive error for title", title, err)
    }
  }

  return jobs
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
