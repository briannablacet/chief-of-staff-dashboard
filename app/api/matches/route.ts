import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import type { MatchDoc } from "@/lib/actions"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const db = await getDb()
    const matches = await db
      .collection<MatchDoc>("matches")
      .find({ userId: session.user.id })
      .sort({ score: -1, updatedAt: -1 })
      .toArray()

    return NextResponse.json(
      matches.map((m) => ({ ...m, _id: m._id?.toString() }))
    )
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 })
  }
}
