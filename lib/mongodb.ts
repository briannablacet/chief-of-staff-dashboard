import { MongoClient, Db } from "mongodb"

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_CONNECTION_STRING_4
  if (!uri) {
    throw new Error("MONGODB_CONNECTION_STRING_4 environment variable is not set")
  }
  // Cache the client promise globally in both dev and production to avoid
  // opening a new connection on every request (hits Atlas connection limits).
  // If the connection attempt fails, clear the cache so the next call
  // retries fresh instead of replaying the same rejected promise forever —
  // .connect() returns a Promise immediately, and an assigned Promise is
  // truthy even when it later rejects, so a failed connection was
  // permanently "cached" as a failure with no way to recover short of a
  // full redeploy.
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    }).connect().catch((err) => {
      global._mongoClientPromise = undefined
      throw err
    })
  }
  return global._mongoClientPromise
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise()
  return client.db("chief-of-staff")
}
