"use server"

import { getDb } from "@/lib/mongodb"
import { revalidatePath } from "next/cache"
import { archiveMatches } from "@/lib/cos-data"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DirectivesDoc = {
  _id?: string
  userId: string
  name: string
  headline: string
  titles: string[]
  locations: string[]
  salaryMin: number
  salaryMax: number
  remoteOnly: boolean
  dreamCompanies: string[]
  dealbreakers: string[]
  resumeText: string
  resumeFileName: string
  linkedinUrl: string
  defaultCoverLetter: string
  updatedAt: Date
}

export type MatchDoc = {
  _id?: string
  userId: string
  matchId: string
  company: string
  role: string
  location: string
  workModel: "Remote" | "Hybrid" | "On-site"
  salary: string
  score: number
  status: "New" | "Reviewed" | "Applied"
  postedAgo: string
  breakdown: { label: string; met: boolean; note: string }[]
  coverLetter: string
  updatedAt: Date
}

export type AgentDoc = {
  _id?: string
  userId: string
  agentId: string
  enabled: boolean
  systemPrompt: string
  updatedAt: Date
}

// For now every user shares the same singleton doc — swap "default" for a
// real user ID once you add auth.
const USER_ID = "default"

// ---------------------------------------------------------------------------
// Directives
// ---------------------------------------------------------------------------

export async function getDirectives(): Promise<DirectivesDoc | null> {
  try {
    const db = await getDb()
    const doc = await db
      .collection<DirectivesDoc>("directives")
      .findOne({ userId: USER_ID })
    if (!doc) return null
    return { ...doc, _id: doc._id?.toString() }
  } catch (err) {
    console.error("[v0] getDirectives failed:", err)
    return null
  }
}

export async function saveDirectives(
  data: Omit<DirectivesDoc, "_id" | "userId" | "updatedAt">
): Promise<void> {
  const db = await getDb()
  await db.collection<DirectivesDoc>("directives").updateOne(
    { userId: USER_ID },
    {
      $set: {
        ...data,
        userId: USER_ID,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  )
  revalidatePath("/")
}

// ---------------------------------------------------------------------------
// Agent configs
// ---------------------------------------------------------------------------

export async function getAgentConfigs(): Promise<AgentDoc[]> {
  try {
    const db = await getDb()
    const docs = await db
      .collection<AgentDoc>("agents")
      .find({ userId: USER_ID })
      .toArray()
    return docs.map((d) => ({ ...d, _id: d._id?.toString() }))
  } catch (err) {
    console.error("[v0] getAgentConfigs failed:", err)
    return []
  }
}

export async function saveAgentConfig(
  agentId: string,
  patch: { enabled?: boolean; systemPrompt?: string }
): Promise<void> {
  const db = await getDb()
  await db.collection<AgentDoc>("agents").updateOne(
    { userId: USER_ID, agentId },
    {
      $set: {
        ...patch,
        userId: USER_ID,
        agentId,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  )
  revalidatePath("/")
}

// ---------------------------------------------------------------------------
// Matches
// ---------------------------------------------------------------------------

export async function getMatches(): Promise<MatchDoc[]> {
  try {
    const db = await getDb()
    const count = await db
      .collection<MatchDoc>("matches")
      .countDocuments({ userId: USER_ID })

    // Seed from mock data on first run
    if (count === 0) {
      await db.collection<MatchDoc>("matches").insertMany(
        archiveMatches.map((m) => ({
          userId: USER_ID,
          matchId: m.id,
          company: m.company,
          role: m.role,
          location: m.location,
          workModel: m.workModel,
          salary: m.salary,
          score: m.score,
          status: m.status,
          postedAgo: m.postedAgo,
          breakdown: m.breakdown,
          coverLetter: m.coverLetter,
          updatedAt: new Date(),
        }))
      )
    }

    const docs = await db
      .collection<MatchDoc>("matches")
      .find({ userId: USER_ID })
      .sort({ score: -1 })
      .toArray()

    return docs.map((d) => ({ ...d, _id: d._id?.toString() }))
  } catch (err) {
    console.error("[v0] getMatches failed:", err)
    return []
  }
}

export async function updateMatchStatus(
  matchId: string,
  status: "New" | "Reviewed" | "Applied"
): Promise<void> {
  const db = await getDb()
  await db.collection<MatchDoc>("matches").updateOne(
    { userId: USER_ID, matchId },
    { $set: { status, updatedAt: new Date() } }
  )
  revalidatePath("/")
}
