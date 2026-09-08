import mongoose from 'mongoose';

export function getSanitizedMongoUri(): string | null {
  let uri = (process.env.MONGODB_URI || process.env.MONGO_URL || '').trim();
  if (!uri) return null;

  // Remove surrounding quotes if accidentally pasted in Vercel
  if (
    (uri.startsWith('"') && uri.endsWith('"')) ||
    (uri.startsWith("'") && uri.endsWith("'"))
  ) {
    uri = uri.slice(1, -1).trim();
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
    return null;
  }

  return uri;
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
  const mongoUri = getSanitizedMongoUri();
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
      dbName: process.env.MONGODB_DB_NAME || 'threads_agent',
    };

    cached!.promise = mongoose.connect(mongoUri, opts).then((m) => {
      console.log('✅ Connected to MongoDB Atlas');
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
