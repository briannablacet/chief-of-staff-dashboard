/**
 * POST /api/import-job
 *
 * Receives a job capture from the bookmarklet (page title, URL, selected text),
 * uses AI to parse out role / company / location / salary, then saves as a manual match.
 *
 * Body: { url: string, title: string, text: string, secret: string }
 */

import { NextRequest, NextResponse } from "next/server"
import { importJob } from "@/lib/import-job"
import { getDb } from "@/lib/mongodb"
import type { DirectivesDoc } from "@/lib/actions"

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

    const db = await getDb()

    // Resolve the real userId from directives — bookmarklet can't carry a session
    // cookie cross-origin, so we look up the most recently updated directives doc.
    const directives = await db
      .collection<DirectivesDoc>("directives")
      .findOne({ userId: { $ne: "default" } }, { sort: { updatedAt: -1 } })

    const { role, company, hasCoverLetter } = await importJob({
      userId: directives?.userId ?? "default",
      url,
      title,
      text,
    })

    return NextResponse.json({ ok: true, role, company, hasCoverLetter }, { headers: CORS_HEADERS })
  } catch (err) {
    console.error("[import-job]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: CORS_HEADERS })
  }
}
