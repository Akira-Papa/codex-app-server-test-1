import type { NextConfig } from "next";

/**
 * ブラウザ側の基本的な防御ヘッダーです。
 *
 * CSP は Next.js dev/prod の script 生成と衝突しやすいため、このサンプルでは
 * 壊れにくいヘッダーだけを設定しています。
 */
const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "same-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

/**
 * Next.js のアプリ全体設定です。
 */
const nextConfig: NextConfig = {
  /**
   * 全ルートへ基本的なセキュリティヘッダーを付与します。
   *
   * @returns Next.js がレスポンスへ追加するヘッダー設定です。
   */
  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
  ],
};

export default nextConfig;
