import mongoose from "mongoose";

/**
 * MongoDB への接続 URL です。
 *
 * Next.js の API Route からだけ使うため、`.env.local` の `MONGODB_URI` を
 * サーバー側で読み込みます。
 */
const MONGODB_URI = process.env.MONGODB_URI ?? "";

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not set");
}

type MongooseCache = {
  /** 確立済みの Mongoose 接続です。 */
  conn: typeof mongoose | null;
  /** 接続処理中の Promise です。ホットリロード中の多重接続を防ぎます。 */
  promise: Promise<typeof mongoose> | null;
};

declare global {
  /**
   * Next.js の開発時ホットリロードをまたいで Mongoose 接続を再利用するための
   * グローバルキャッシュです。
   */
  var mongooseCache: MongooseCache | undefined;
}

/**
 * 実際に参照する Mongoose 接続キャッシュです。
 */
const cached = globalThis.mongooseCache ?? {
  conn: null,
  promise: null,
};

globalThis.mongooseCache = cached;

/**
 * MongoDB へ接続し、既存接続があればそれを再利用します。
 *
 * @returns 接続済みの Mongoose インスタンスです。
 * @throws MongoDB へ接続できない場合は Mongoose の接続エラーを投げます。
 */
export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}
