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
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect()
    }
    return global._mongoClientPromise
  }
  return new MongoClient(uri).connect()
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise()
  return client.db("chief-of-staff")
}
