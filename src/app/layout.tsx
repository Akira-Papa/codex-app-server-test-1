import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * アプリ全体で使う Geist Sans フォントの CSS 変数設定です。
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/**
 * アプリ全体で使う Geist Mono フォントの CSS 変数設定です。
 */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Quote Lab のページタイトルと説明文です。
 */
export const metadata: Metadata = {
  title: "Quote Lab",
  description: "Theme-based quote generator powered by Codex App Server",
};

/**
 * Next.js App Router のルートレイアウトです。
 *
 * @param props.children 各ページのコンテンツです。
 * @returns アプリ全体に共通する HTML 構造です。
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
