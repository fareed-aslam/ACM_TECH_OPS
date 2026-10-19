import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

function cleanMongoUri(rawUri?: string): string | null {
  if (!rawUri) return null;
  let uri = rawUri.trim();

  // Strip accidental "MONGODB_URI=" if user pasted key name
  while (uri.startsWith("MONGODB_URI=")) {
    uri = uri.substring("MONGODB_URI=".length).trim();
  }

  // Strip wrapping quotes if any
  uri = uri.replace(/^["']|["']$/g, "").trim();

  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    return null;
  }

  // Append database name techtrivia if missing after host
  if (uri.endsWith(".mongodb.net/")) {
    uri += "techtrivia?retryWrites=true&w=majority";
  } else if (uri.endsWith(".mongodb.net")) {
    uri += "/techtrivia?retryWrites=true&w=majority";
  }

  return uri;
}

let lastFailureTime = 0;
const FAILURE_COOLDOWN_MS = 6000;

export async function connectDB(): Promise<typeof mongoose | null> {
  const uri = cleanMongoUri(process.env.MONGODB_URI);

  if (!uri) {
    return null;
  }

  if (cached!.conn && mongoose.connection.readyState === 1) {
    return cached!.conn;
  }

  // If connection recently failed, fast-fail to memory store instead of blocking for 5s
  if (Date.now() - lastFailureTime < FAILURE_COOLDOWN_MS) {
    return null;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 50,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 4000,
      socketTimeoutMS: 20000,
    };

    cached!.promise = mongoose.connect(uri, opts).then((m) => {
      console.log("[DB] Connected successfully to MongoDB Atlas:", uri.replace(/:([^@]+)@/, ":****@"));
      lastFailureTime = 0;
      return m;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    cached!.conn = null;
    lastFailureTime = Date.now();
    throw e;
  }

  return cached!.conn;
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
