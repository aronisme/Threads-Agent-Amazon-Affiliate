import mongoose from 'mongoose';

export function getSanitizedMongoConfig(): { uri: string | null; dbName: string } {
  let uri = (process.env.MONGODB_URI || process.env.MONGO_URL || '').trim();
  let dbName = (process.env.MONGODB_DB_NAME || 'threads_agent').trim();

  // Strip surrounding quotes
  const cleanStr = (s: string) => {
    let res = s.trim();
    if (
      (res.startsWith('"') && res.endsWith('"')) ||
      (res.startsWith("'") && res.endsWith("'"))
    ) {
      res = res.slice(1, -1).trim();
    }
    return res;
  };

  uri = cleanStr(uri);
  dbName = cleanStr(dbName);

  // AUTO-FIX: User swapped MONGODB_URI and MONGODB_DB_NAME in Vercel!
  // If MONGODB_DB_NAME contains the connection string (starts with mongodb:// or mongodb+srv://)
  if (dbName.startsWith('mongodb://') || dbName.startsWith('mongodb+srv://')) {
    console.warn(
      '🔄 Auto-Fix: Detected connection string inside MONGODB_DB_NAME! Automatically swapping with MONGODB_URI.'
    );
    const realUri = dbName;
    const realDbName =
      !uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://') && uri.length > 0
        ? uri
        : 'threads_agent';
    uri = realUri;
    dbName = realDbName;
  }

  // Handle common copy-paste errors
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    if (uri.startsWith('//')) {
      uri = `mongodb+srv:${uri}`;
    } else if (uri.includes('@') && uri.includes('.mongodb.net')) {
      uri = `mongodb+srv://${uri}`;
    }
  }

  // Final scheme validation
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    console.warn(
      `⚠️ Invalid MONGODB_URI scheme: "${uri.substring(0, 20)}...". Expected connection string to start with "mongodb://" or "mongodb+srv://". Falling back to in-memory mode.`
    );
    return { uri: null, dbName: 'threads_agent' };
  }

  return { uri, dbName };
}

// Keep backwards-compatible helper
export function getSanitizedMongoUri(): string | null {
  return getSanitizedMongoConfig().uri;
}

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

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  const { uri: mongoUri, dbName } = getSanitizedMongoConfig();
  if (!mongoUri) {
    console.warn('⚠️ MONGODB_URI is not defined or invalid. Database operations will be mocked or skipped.');
    return null;
  }

  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      dbName: dbName || 'threads_agent',
    };

    cached!.promise = mongoose.connect(mongoUri, opts).then((m) => {
      console.log(`✅ Connected to MongoDB Atlas (Database: ${opts.dbName})`);
      return m;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    console.error('❌ MongoDB Connection Error:', e);
    throw e;
  }

  return cached!.conn;
}

export default connectToDatabase;
