/**
 * One-off script: removes all MongoDB documents with userId="default"
 * These were created before auth was added and pollute every user's view.
 *
 * Run with:
 *   node --env-file-if-exists=/vercel/share/.env.project scripts/cleanup-default-user.mjs
 */
import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error("MONGODB_URI is not set")
  process.exit(1)
}

const client = new MongoClient(uri)
await client.connect()
const db = client.db("chief-of-staff")

const collections = ["matches", "directives", "agents", "cover_letters"]

for (const col of collections) {
  const result = await db.collection(col).deleteMany({ userId: "default" })
  console.log(`${col}: deleted ${result.deletedCount} docs with userId="default"`)
}

await client.close()
console.log("Done.")
