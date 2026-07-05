import { MongoClient, Db } from "mongodb"

const uri = process.env.MONGODB_URI || "mongodb+srv://brianna-blacet:mongoBb14c3t!@cluster0-clone.flavamx.mongodb.net/chiefofstaff?retryWrites=true&w=majority"

let client: MongoClient
let clientPromise: Promise<MongoClient>

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

if (process.env.NODE_ENV === "development") {
  // In development, reuse the client across hot reloads to avoid exhausting connections
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  client = new MongoClient(uri)
  clientPromise = client.connect()
}

export async function getDb(): Promise<Db> {
  const c = await clientPromise
  return c.db("chiefofstaff")
}

export default clientPromise
