/**
 * GET /api/jobs/cron
 *
 * Called by Vercel Cron at 7:00 AM UTC daily.
 * Validates the CRON_SECRET header then delegates to the pipeline route.
 */

import { NextRequest, NextResponse } from "next/server"
import { runJobPipeline } from "../run/pipeline"

export const maxDuration = 300

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  // Call the pipeline directly — avoids unreliable self-referential HTTP fetch on Vercel
  const result = await runJobPipeline()
  return NextResponse.json({ cron: true, ...result })
}
