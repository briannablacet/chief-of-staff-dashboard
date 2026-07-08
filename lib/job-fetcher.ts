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
  source: "adzuna" | "remotive" | "remoteok" | "wwr" | "jsearch"
  title: string
  company: string
  location: string
  description: string       // plain text, may be HTML-stripped
  url: string
  postedAt: string          // ISO date string
  salary?: string           // formatted display string e.g. "$185k–$210k"
  salaryRaw?: number        // raw mid-point in full dollars — avoids string parse bugs
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
  // Adzuna cross-posts the same job to every US city — dedup by company+title
  const seenCompanyTitle = new Set<string>()

  for (const title of titles.slice(0, 5)) {
    try {
      // Don't append "remote" to query — it shrinks results dramatically.
      // The pipeline scorer handles remote preference as a scoring factor.
      const query = encodeURIComponent(title)
      const url =
        `https://api.adzuna.com/v1/api/jobs/us/search/1` +
        `?app_id=${appId}&app_key=${appKey}` +
        `&results_per_page=50` +
        `&what=${query}` +
        `&content-type=application/json`

      const res = await fetch(url, { next: { revalidate: 0 } })
      if (!res.ok) {
        console.log("[v0] Adzuna fetch failed:", res.status, await res.text())
        continue
      }
      const data = await res.json() as { results: AdzunaJob[] }
      for (const j of data.results ?? []) {
        if (!isWithinTwoWeeks(j.created)) continue
        // Skip cross-posted duplicates (same title + company, different city)
        const key = `${j.company.display_name}|${j.title}`.toLowerCase()
        if (seenCompanyTitle.has(key)) continue
        seenCompanyTitle.add(key)
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
          salaryRaw: j.salary_min && j.salary_max
            ? Math.round((j.salary_min + j.salary_max) / 2)
            : undefined,
        })
        if (jobs.length >= maxResults) break
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
        if (!isWithinTwoWeeks(j.publication_date)) continue
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
// RemoteOK (free, no auth, remote-only)
// ---------------------------------------------------------------------------

type RemoteOKJob = {
  id: string
  url: string
  position: string
  company: string
  location: string
  description: string
  date: string
  salary_min?: number
  salary_max?: number
  tags?: string[]
}

export async function fetchRemoteOKJobs(
  titles: string[],
  maxResults = 30
): Promise<RawJob[]> {
  try {
    // RemoteOK returns all jobs; we filter client-side by title keywords
    const res = await fetch("https://remoteok.com/api", {
      headers: { "User-Agent": "ChiefOfStaffDashboard/1.0" },
      next: { revalidate: 0 },
    })
    if (!res.ok) {
      console.log("[v0] RemoteOK fetch failed:", res.status)
      return []
    }
    const data = await res.json() as RemoteOKJob[]
    const keywords = titles.flatMap((t) => t.toLowerCase().split(/\s+/).filter((w) => w.length > 3))
    const jobs: RawJob[] = []
    const seen = new Set<string>()

    for (const j of data) {
      if (!j.id || !j.position) continue
      if (seen.has(j.id)) continue
      if (!isWithinTwoWeeks(j.date)) continue
      const titleLower = j.position.toLowerCase()
      const matches = keywords.some((kw) => titleLower.includes(kw))
      if (!matches) continue
      seen.add(j.id)
      jobs.push({
        sourceId: `remoteok:${j.id}`,
        source: "remoteok",
        title: j.position,
        company: j.company,
        location: j.location || "Remote",
        description: stripHtml(j.description || "").slice(0, 2000),
        url: j.url,
        postedAt: j.date,
        salary: j.salary_min && j.salary_max
          ? `$${Math.round(j.salary_min / 1000)}k–$${Math.round(j.salary_max / 1000)}k`
          : undefined,
      })
      if (jobs.length >= maxResults) break
    }
    return jobs
  } catch (err) {
    console.log("[v0] RemoteOK error:", err)
    return []
  }
}

// ---------------------------------------------------------------------------
// We Work Remotely (free RSS, remote-only)
// ---------------------------------------------------------------------------

export async function fetchWWRJobs(
  titles: string[],
  maxResults = 30
): Promise<RawJob[]> {
  // WWR exposes per-category RSS feeds. Map common role keywords to categories.
  const categoryMap: Record<string, string> = {
    default: "all-other-remote-jobs",
    executive: "senior-exec",
    product: "product",
    marketing: "marketing-and-sales",
    design: "design",
    management: "senior-exec",
    director: "senior-exec",
    vp: "senior-exec",
    "vice president": "senior-exec",
    operations: "all-other-remote-jobs",
    enablement: "all-other-remote-jobs",
  }

  const categories = new Set<string>(["all-other-remote-jobs"])
  for (const title of titles) {
    const tl = title.toLowerCase()
    for (const [kw, cat] of Object.entries(categoryMap)) {
      if (tl.includes(kw)) categories.add(cat)
    }
  }

  const keywords = titles.flatMap((t) =>
    t.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  )
  const jobs: RawJob[] = []
  const seen = new Set<string>()

  for (const category of Array.from(categories).slice(0, 3)) {
    try {
      const res = await fetch(
        `https://weworkremotely.com/categories/remote-${category}-jobs.rss`,
        { next: { revalidate: 0 } }
      )
      if (!res.ok) continue
      const xml = await res.text()
      // Parse RSS items with regex — avoids needing an XML library
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
      for (const item of items) {
        const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ?? [])[1] ?? ""
        const link  = (item.match(/<link>(.*?)<\/link>/)                 ?? [])[1] ?? ""
        const desc  = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) ?? [])[1] ?? ""
        const pub   = (item.match(/<pubDate>(.*?)<\/pubDate>/)           ?? [])[1] ?? ""
        const company = (item.match(/<region><!\[CDATA\[(.*?)\]\]><\/region>/) ?? [])[1] ?? "Unknown"
        const id = link.split("/").filter(Boolean).pop() ?? `wwr-${Date.now()}-${Math.random()}`
        if (!title || seen.has(id)) continue
        if (!isWithinTwoWeeks(pub)) continue
        const tl = title.toLowerCase()
        if (!keywords.some((kw) => tl.includes(kw))) continue
        seen.add(id)
        jobs.push({
          sourceId: `wwr:${id}`,
          source: "wwr",
          title,
          company,
          location: "Remote",
          description: stripHtml(desc).slice(0, 2000),
          url: link,
          postedAt: pub ? new Date(pub).toISOString() : new Date().toISOString(),
        })
        if (jobs.length >= maxResults) break
      }
    } catch (err) {
      console.log("[v0] WWR error for category", category, err)
    }
  }
  return jobs
}

// ---------------------------------------------------------------------------
// JSearch via RapidAPI (paid, aggregates Indeed, LinkedIn, Glassdoor, etc.)
// ---------------------------------------------------------------------------

type JSearchJob = {
  job_id: string
  job_title: string
  employer_name: string
  job_city?: string
  job_state?: string
  job_country?: string
  job_is_remote?: boolean
  job_description: string
  job_apply_link: string
  job_posted_at_datetime_utc?: string
  job_min_salary?: number
  job_max_salary?: number
  job_salary_currency?: string
}

export async function fetchJSearchJobs(
  titles: string[],
  remoteOnly: boolean,
  maxResults = 50
): Promise<RawJob[]> {
  const apiKey = process.env.JSEARCH_API_KEY
  if (!apiKey) {
    console.log("[v0] JSearch API key missing — skipping JSearch fetch")
    return []
  }

  const jobs: RawJob[] = []
  const seen = new Set<string>()
  const perTitle = Math.ceil(maxResults / Math.max(titles.length, 1))

  for (const title of titles.slice(0, 5)) {
    try {
      const query = remoteOnly ? `${title} remote` : title
      const url = new URL("https://jsearch.p.rapidapi.com/search-v2")
      url.searchParams.set("query", query)
      url.searchParams.set("page", "1")
      url.searchParams.set("num_pages", "1")
      url.searchParams.set("date_posted", "month")
      if (remoteOnly) url.searchParams.set("remote_jobs_only", "true")

      const res = await fetch(url.toString(), {
        headers: {
          "x-rapidapi-host": "jsearch.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
        },
        next: { revalidate: 0 },
      })
      if (!res.ok) {
        console.log("[v0] JSearch fetch failed:", res.status, await res.text())
        continue
      }
      const data = await res.json() as { data: JSearchJob[] | { jobs: JSearchJob[] } }
      // search-v2 wraps results in data.data.jobs; original /search used data.data directly
      const jobList: JSearchJob[] = Array.isArray(data.data)
        ? data.data
        : (data.data as { jobs: JSearchJob[] })?.jobs ?? []
      for (const j of jobList.slice(0, perTitle)) {
        if (!j.job_id || seen.has(j.job_id)) continue
        if (j.job_posted_at_datetime_utc && !isWithinTwoWeeks(j.job_posted_at_datetime_utc)) continue
        seen.add(j.job_id)
        const loc = [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", ")
        let salary: string | undefined
        let salaryRaw: number | undefined
        if (j.job_min_salary && j.job_max_salary) {
          const curr = j.job_salary_currency === "USD" ? "$" : (j.job_salary_currency ?? "$")
          salary = `${curr}${Math.round(j.job_min_salary / 1000)}k–${curr}${Math.round(j.job_max_salary / 1000)}k`
          salaryRaw = Math.round((j.job_min_salary + j.job_max_salary) / 2)
        }
        jobs.push({
          sourceId: `jsearch:${j.job_id}`,
          source: "jsearch",
          title: j.job_title,
          company: j.employer_name,
          location: j.job_is_remote ? "Remote" : (loc || "Unknown"),
          description: j.job_description.slice(0, 3000),
          url: j.job_apply_link,
          postedAt: j.job_posted_at_datetime_utc ?? new Date().toISOString(),
          salary,
          salaryRaw,
        })
      }
    } catch (err) {
      console.log("[v0] JSearch error for title", title, err)
    }
  }
  return jobs
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000

export function isWithinTwoWeeks(postedAt: string): boolean {
  if (!postedAt) return true // no date = keep it
  const posted = new Date(postedAt).getTime()
  return !isNaN(posted) && Date.now() - posted <= SIXTY_DAYS_MS
}

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
