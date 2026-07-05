import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import type { MatchDoc } from "@/lib/actions"

const USER_ID = "default"

export async function GET() {
  try {
    const db = await getDb()
    const matches = await db
      .collection<MatchDoc>("matches")
      .find({ userId: USER_ID })
      .sort({ score: -1, createdAt: -1 })
      .limit(100)
      .toArray()

    return NextResponse.json(
      matches.map((m) => ({ ...m, _id: m._id?.toString() }))
    )
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 })
  }
}
