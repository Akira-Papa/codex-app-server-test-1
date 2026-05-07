/**
 * API が受け付ける JSON body の最大バイト数です。
 */
export const MAX_REQUEST_BODY_BYTES = 4096;

/**
 * ユーザーが入力できるテーマの最大文字数です。
 */
export const MAX_THEME_LENGTH = 200;

/**
 * MongoDB に保存する名言本文の最大文字数です。
 */
export const MAX_QUOTE_LENGTH = 300;

/**
 * MongoDB に保存する著者名の最大文字数です。
 */
export const MAX_AUTHOR_LENGTH = 80;

/**
 * 表示や保存に不要な制御文字を落とすための正規表現です。
 */
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/g;

/**
 * 連続する空白を 1 つの半角スペースへまとめるための正規表現です。
 */
const WHITESPACE_PATTERN = /\s+/g;

/**
 * 外部入力やモデル出力を、画面表示と DB 保存に向いた短い文字列へ正規化します。
 *
 * @param value 正規化する未知の値です。
 * @param maxLength 許可する最大文字数です。
 * @returns 制御文字を除去し、空白を整え、最大文字数に収めた文字列です。
 */
export function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFKC")
    .replace(CONTROL_CHARACTER_PATTERN, " ")
    .replace(WHITESPACE_PATTERN, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * リクエストの `Content-Length` が許容範囲内かどうかを判定します。
 *
 * @param request API Route に届いた HTTP リクエストです。
 * @returns body を読み込んでもよい場合は `true` です。
 */
export function isRequestBodyWithinLimit(request: Request) {
  const contentLength = request.headers.get("content-length");

  if (!contentLength) {
    return true;
  }

  const size = Number(contentLength);
  return Number.isFinite(size) && size <= MAX_REQUEST_BODY_BYTES;
}

/**
 * `/api/generate` の JSON body から安全なテーマ文字列を取り出します。
 *
 * @param body `request.json()` で得た未知の body です。
 * @returns 正規化済みテーマです。無効な場合は空文字列です。
 */
export function parseTheme(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "";
  }

  return normalizeText(
    (body as { theme?: unknown }).theme,
    Number.MAX_SAFE_INTEGER,
  );
}

/**
 * ブラウザからの変更系リクエストが同一 origin から来ているか判定します。
 *
 * `Origin` がない curl やサーバー間リクエストはローカル開発の利便性のため許可します。
 *
 * @param request API Route に届いた HTTP リクエストです。
 * @returns 同一 origin または origin なしなら `true` です。
 */
export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

/**
 * リクエストの `Content-Type` が JSON として扱えるか判定します。
 *
 * @param request API Route に届いた HTTP リクエストです。
 * @returns JSON body として扱える場合は `true` です。
 */
export function isJsonRequest(request: Request) {
  const contentType = request.headers.get("content-type");
  return contentType?.toLowerCase().includes("application/json") ?? false;
}
