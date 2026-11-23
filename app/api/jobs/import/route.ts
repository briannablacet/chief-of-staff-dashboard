/**
 * POST /api/jobs/import  — session-authed "paste a job" endpoint.
 * Body: { url?: string, text?: string }. Pasted text wins; with only a URL we
 * try to read the page, and if the site blocks us we ask for the text instead.
 */
import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { importJob } from "@/lib/import-job"
import { fetchJobPage } from "@/lib/fetch-job-page"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const url = typeof body.url === "string" ? body.url.trim() : ""
  let text = typeof body.text === "string" ? body.text.trim() : ""
  let title = ""

  if (!url && !text) {
    return NextResponse.json({ error: "Paste a job link or the job description." }, { status: 400 })
  }
  if (text.length > 0 && text.length < 80 && !url) {
    return NextResponse.json({ error: "That's too short to be a job description — paste the full posting." }, { status: 400 })
  }

  if (!text) {
    try {
      const page = await fetchJobPage(url)
      title = page.title
      text = page.text
    } catch (err) {
      const why = err instanceof Error ? err.message : "Couldn't load it."
      return NextResponse.json(
        { error: `Couldn't read that page (${why}) Many job sites block this — open the posting, copy the description, and paste it below instead.`, needsText: true },
        { status: 422 }
      )
    }
    if (text.length < 300) {
      return NextResponse.json(
        { error: "That page didn't contain a readable job description (it may need a login or load with JavaScript). Paste the description text below instead.", needsText: true },
        { status: 422 }
      )
    }
  }

  if (!title) title = text.split("\n").find((l: string) => l.trim())?.trim().slice(0, 120) ?? "Job"

  try {
    const result = await importJob({ userId: session.user.id, url, title, text })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error("[jobs/import]", err)
    return NextResponse.json({ error: "Something went wrong saving that job. Try again." }, { status: 500 })
  }
}
