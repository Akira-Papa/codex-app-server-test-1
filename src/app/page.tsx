"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

/**
 * API から返ってくる名言データを、画面表示用に表した型です。
 */
type Quote = {
  /** MongoDB の `_id` を文字列化した ID です。 */
  id: string;
  /** 名言を生成したときにユーザーが入力したテーマです。 */
  theme: string;
  /** Codex App Server で生成された名言本文です。 */
  quote: string;
  /** 名言の語り手として表示する架空の著者名です。 */
  author: string;
  /** MongoDB に保存された日時の ISO 文字列です。 */
  createdAt: string;
};

/**
 * ISO 日時文字列を、日本語 UI 向けの読みやすい日時に整形します。
 *
 * @param value API から返る `createdAt` の ISO 日時文字列です。
 * @returns 例: `2026/05/08 0:38` のような表示用文字列です。
 */
function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * テーマ入力、名言生成、保存済み名言一覧をまとめたトップページです。
 *
 * @returns Quote Lab のメイン画面です。
 */
export default function Home() {
  /** 入力フォームで編集中のテーマです。 */
  const [theme, setTheme] = useState("");
  /** MongoDB から取得した保存済み名言の一覧です。 */
  const [quotes, setQuotes] = useState<Quote[]>([]);
  /** 画面上部に大きく表示する直近の名言です。 */
  const [latestQuote, setLatestQuote] = useState<Quote | null>(null);
  /** 名言生成 API を呼び出している最中かどうかです。 */
  const [isGenerating, setIsGenerating] = useState(false);
  /** 名言一覧 API を読み込んでいる最中かどうかです。 */
  const [isLoading, setIsLoading] = useState(true);
  /** API エラーやバリデーションエラーを画面に出すためのメッセージです。 */
  const [error, setError] = useState("");

  /**
   * 現在の入力内容で生成ボタンを押せるかどうかを判定します。
   */
  const canSubmit = useMemo(
    () => theme.trim().length > 0 && theme.trim().length <= 200,
    [theme],
  );

  /**
   * 保存済み名言を API から読み込み、一覧と最新名言の表示を更新します。
   */
  async function loadQuotes() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/quotes");

      if (!response.ok) {
        throw new Error("名言一覧の取得に失敗しました。");
      }

      const data = (await response.json()) as Quote[];
      setQuotes(data);
      setLatestQuote(data[0] ?? null);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "名言一覧の取得に失敗しました。",
      );
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * 初回表示時に保存済み名言を読み込みます。
   */
  useEffect(() => {
    void loadQuotes();
  }, []);

  /**
   * 入力されたテーマで名言生成 API を呼び出し、結果を画面と履歴に反映します。
   *
   * @param event テーマ入力フォームの submit イベントです。
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedTheme = theme.trim();
    if (!normalizedTheme || normalizedTheme.length > 200) {
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ theme: normalizedTheme }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "名言の生成に失敗しました。");
      }

      const generated = data as Quote;
      setLatestQuote(generated);
      setQuotes((current) => [
        generated,
        ...current.filter((quote) => quote.id !== generated.id),
      ]);
      setTheme("");
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "名言の生成に失敗しました。",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  /**
   * 指定した名言を削除 API で消し、画面上の一覧からも取り除きます。
   *
   * @param id 削除する名言の MongoDB ID 文字列です。
   */
  async function handleDelete(id: string) {
    setError("");

    try {
      const response = await fetch(`/api/quotes?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "削除に失敗しました。");
      }

      setQuotes((current) => current.filter((quote) => quote.id !== id));
      setLatestQuote((current) => (current?.id === id ? null : current));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "削除に失敗しました。",
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-2 border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Theme to quote
          </p>
          <h1 className="text-4xl font-semibold tracking-normal text-slate-950">
            Quote Lab
          </h1>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <label
              htmlFor="theme"
              className="text-sm font-medium text-slate-700"
            >
              テーマ
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="theme"
                value={theme}
                onChange={(event) => setTheme(event.target.value)}
                maxLength={200}
                placeholder="友情、努力、旅立ち..."
                className="min-h-12 flex-1 rounded-md border border-slate-300 bg-white px-4 text-base outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              />
              <button
                type="submit"
                disabled={!canSubmit || isGenerating}
                className="min-h-12 rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isGenerating ? "生成中..." : "名言を生成"}
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>200文字以内</span>
              <span>{theme.trim().length}/200</span>
            </div>
          </form>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-semibold text-emerald-800">最新の名言</p>
            {latestQuote ? (
              <blockquote className="mt-4 flex flex-col gap-4">
                <p className="text-2xl font-semibold leading-relaxed text-slate-950">
                  {latestQuote.quote}
                </p>
                <footer className="text-sm text-slate-600">
                  {latestQuote.author} / {latestQuote.theme}
                </footer>
              </blockquote>
            ) : (
              <p className="mt-4 text-sm leading-6 text-slate-600">
                テーマを入れて生成すると、ここに結果が表示されます。
              </p>
            )}
          </div>
        </section>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">履歴</h2>
              <p className="mt-1 text-sm text-slate-500">
                MongoDB に保存された名言を新しい順に表示します。
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadQuotes()}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-500 hover:text-emerald-700"
            >
              更新
            </button>
          </div>

          {isLoading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">
              読み込み中...
            </div>
          ) : quotes.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">
              まだ保存された名言はありません。
            </div>
          ) : (
            <div className="grid gap-3">
              {quotes.map((item) => (
                <article
                  key={item.id}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-800">
                          {item.theme}
                        </span>
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                      <p className="mt-3 text-lg font-medium leading-8 text-slate-950">
                        {item.quote}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {item.author}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      className="min-h-10 shrink-0 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                    >
                      削除
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
