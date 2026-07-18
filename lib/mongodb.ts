import { MongoClient, Db } from "mongodb"

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_CONNECTION_STRING_3
  if (!uri) {
    throw new Error("MONGODB_CONNECTION_STRING_3 environment variable is not set")
  }
  // Cache the client promise globally in both dev and production to avoid
  // opening a new connection on every request (hits Atlas connection limits)
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    }).connect()
  }
  return global._mongoClientPromise
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise()
  return client.db("chief-of-staff")
}
