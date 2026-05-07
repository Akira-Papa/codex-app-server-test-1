import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { isSameOriginRequest } from "@/lib/validation";
import Quote from "@/models/Quote";

/**
 * Mongoose と MongoDB を使うため、この API Route は Node.js runtime で動かします。
 */
export const runtime = "nodejs";

/**
 * `.lean()` で取得した名言ドキュメントを表す軽量な型です。
 */
type LeanQuote = {
  /** MongoDB が発行したドキュメント ID です。 */
  _id: mongoose.Types.ObjectId;
  /** ユーザーが入力した名言生成のテーマです。 */
  theme: string;
  /** Codex App Server で生成した名言本文です。 */
  quote: string;
  /** 名言の語り手として表示する架空の著者名です。 */
  author?: string;
  /** MongoDB へ保存された日時です。 */
  createdAt: Date;
};

/**
 * MongoDB から取得した名言を、フロントエンドで扱いやすい JSON 形式へ変換します。
 *
 * @param quote `.lean()` で取得した名言ドキュメントです。
 * @returns API レスポンスとして返す名言オブジェクトです。
 */
function serializeQuote(quote: LeanQuote) {
  return {
    id: quote._id.toString(),
    theme: quote.theme,
    quote: quote.quote,
    author: quote.author ?? "Unknown",
    createdAt: quote.createdAt.toISOString(),
  };
}

/**
 * 保存済みの名言を新しい順で最大 50 件取得します。
 *
 * @returns 名言一覧、またはサーバーエラーです。
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = Number(searchParams.get("limit") ?? 50);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(Math.floor(rawLimit), 1), 50)
      : 50;

    await connectDB();
    const quotes = await Quote.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<LeanQuote[]>();

    return NextResponse.json(quotes.map(serializeQuote));
  } catch {
    console.error("failed to fetch quotes");

    return NextResponse.json(
      { error: "failed to fetch quotes" },
      { status: 500 },
    );
  }
}

/**
 * クエリパラメータ `id` で指定された名言を 1 件削除します。
 *
 * @param request `?id=...` を含む DELETE リクエストです。
 * @returns 削除結果、またはバリデーション/サーバーエラーです。
 */
export async function DELETE(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "valid id is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const deleted = await Quote.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
    }).lean<LeanQuote>();

    if (!deleted) {
      return NextResponse.json({ error: "quote not found" }, { status: 404 });
    }

    return NextResponse.json({ deleted: true, id });
  } catch {
    console.error("failed to delete quote");

    return NextResponse.json(
      { error: "failed to delete quote" },
      { status: 500 },
    );
  }
}
