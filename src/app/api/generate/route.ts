import { NextResponse } from "next/server";

import { generateQuote } from "@/lib/codex";
import { connectDB } from "@/lib/mongodb";
import {
  isJsonRequest,
  isRequestBodyWithinLimit,
  isSameOriginRequest,
  MAX_THEME_LENGTH,
  parseTheme,
} from "@/lib/validation";
import Quote, { type QuoteDocument } from "@/models/Quote";

/**
 * Codex App Server と Mongoose を使うため、この API Route は Node.js runtime で動かします。
 */
export const runtime = "nodejs";

/**
 * Mongoose のドキュメントを、フロントエンドで扱いやすい JSON 形式へ変換します。
 *
 * @param quote MongoDB に保存された名言ドキュメントです。
 * @returns API レスポンスとして返す名言オブジェクトです。
 */
function serializeQuote(quote: QuoteDocument) {
  return {
    id: quote._id.toString(),
    theme: quote.theme,
    quote: quote.quote,
    author: quote.author ?? "Unknown",
    createdAt: quote.createdAt.toISOString(),
  };
}

/**
 * テーマを受け取り、Codex App Server で名言を生成して MongoDB に保存します。
 *
 * @param request `{ theme: string }` を JSON body に持つ POST リクエストです。
 * @returns 保存済みの名言データ、またはバリデーション/サーバーエラーです。
 */
export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    if (!isJsonRequest(request)) {
      return NextResponse.json(
        { error: "content-type must be application/json" },
        { status: 415 },
      );
    }

    if (!isRequestBodyWithinLimit(request)) {
      return NextResponse.json(
        { error: "request body is too large" },
        { status: 413 },
      );
    }

    const body = await request.json().catch(() => null);
    const theme = parseTheme(body);

    if (!theme) {
      return NextResponse.json(
        { error: "theme is required" },
        { status: 400 },
      );
    }

    if (theme.length > MAX_THEME_LENGTH) {
      return NextResponse.json(
        { error: `theme must be ${MAX_THEME_LENGTH} characters or fewer` },
        { status: 400 },
      );
    }

    await connectDB();
    const generated = await generateQuote(theme);

    const savedQuote = await Quote.create({
      theme,
      quote: generated.quote,
      author: generated.author,
    });

    return NextResponse.json(serializeQuote(savedQuote), { status: 201 });
  } catch {
    console.error("failed to generate quote");

    return NextResponse.json(
      { error: "failed to generate quote" },
      { status: 500 },
    );
  }
}
