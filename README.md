# Quote Lab

Codex App Server を Next.js から呼び出すための小さなローカルサンプルです。

テーマを入力すると、Codex が ChatGPT アカウント認証で短い名言を生成し、その結果を MongoDB に保存します。OpenAI API キーではなく、`codex login` 済みの Codex CLI を使う構成です。

```text
Browser
  -> Next.js App Router
  -> /api/generate
  -> Codex App Server via AI SDK provider
  -> MongoDB
```

## できること

- テーマから日本語の短い名言を生成
- 生成結果を MongoDB に保存
- 保存済み名言を新しい順に一覧表示
- 1件ずつ削除
- Codex App Server の stdio 起動を Next.js API Route から試す

## 前提

- Node.js 20 以上
- Docker Desktop
- Codex CLI v0.128.0 以上
- ChatGPT アカウントで `codex login` 済み

Codex CLI の確認:

```bash
codex --version
codex login
codex exec "Reply with exactly: OK"
```

## セットアップ

```bash
npm install
cp .env.local.example .env.local
npm run mongo:up
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

`3000` が埋まっている場合:

```bash
npm run dev:3001
```

この場合は `http://localhost:3001` を開きます。

## 環境変数

`.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017/quotes
CODEX_MODEL=gpt-5.5
CODEX_PATH=
CODEX_WORKDIR=
CODEX_APP_SERVER_URL=ws://127.0.0.1:4500
```

### `CODEX_MODEL`

ChatGPT アカウント経由の Codex で使うモデル ID です。手元の Codex CLI で利用可能なモデルを確認できます。

```bash
npm run codex:models
```

### `CODEX_PATH`

Next.js から起動する Codex CLI の実体パスです。通常は空で動きます。

ただし、`which codex` が古い shim を指していて、アプリ側だけ古い Codex CLI を掴むことがあります。その場合は `codex --version` が `0.128.0` 以上になる実体パスを指定してください。

確認例:

```bash
which -a codex
/path/to/codex --version
```

設定例:

```env
CODEX_PATH=/Users/you/.nodebrew/current/bin/codex
```

### `CODEX_WORKDIR`

Codex App Server に見せる作業ディレクトリです。デフォルトでは OS の一時ディレクトリ内に空の作業場所を作ります。

名言生成にはリポジトリ内ファイルを読む必要がないため、`.env.local` やソースコードを Codex から見えにくくする目的で、アプリのプロジェクトルートではなく空の一時ディレクトリを使っています。

### `CODEX_APP_SERVER_URL`

このサンプルでは使っていません。WebSocket 版の教材と見比べやすいように残しています。

このリポジトリでは `ai-sdk-provider-codex-app-server@1.1.7` の API に合わせ、Next.js のサーバー処理から `codex app-server` を stdio で起動します。そのため、通常は別ターミナルで `codex app-server --listen ...` を起動しません。

参考: https://developers.openai.com/codex/app-server

## 公式ドキュメントとの対応

OpenAI の Codex App Server ドキュメントでは、基本フローは `codex app-server` を起動し、JSON-RPC で `initialize`、`initialized`、`thread/start`、`turn/start` を送る形です。

このリポジトリでは、その JSON-RPC を直接手書きせず、`ai-sdk-provider-codex-app-server` に任せています。実装上は以下の対応です。

| 公式ドキュメントの要素 | このリポジトリでの扱い |
|---|---|
| `codex app-server` 起動 | Next.js API Route から provider が stdio で自動起動 |
| `initialize` / `initialized` | provider が接続開始時に送信 |
| `thread/start` | `threadMode: "stateless"` のため、生成リクエストごとに新規 thread を作成 |
| `turn/start` | `generateText()` 呼び出し時に、テーマ入力を turn として送信 |
| `model/list` | `npm run codex:models` で利用可能モデル確認に使用 |
| WebSocket transport | 未使用。公式でも experimental / unsupported なので、このサンプルでは stdio を採用 |
| conversation history / approvals UI / streaming events UI | 未実装。名言生成に絞った最小サンプル |

つまり、このサンプルは「App Server の全機能を実装した rich client」ではなく、「Next.js の API Route から Codex App Server を呼び、ChatGPT アカウント認証で 1 ターン生成する」ための最小サンプルです。

## 使い方

1. Docker Desktop を起動
2. `npm run mongo:up`
3. `npm run dev`
4. ブラウザで `http://localhost:3000`
5. テーマ欄に `友情` などを入力
6. `名言を生成` を押す

生成に成功すると、最新の名言カードと履歴一覧に保存結果が表示されます。

## MongoDB を見る

```bash
npm run mongo:shell
```

または:

```bash
docker exec -it quote-mongo mongosh quotes --eval "db.quotes.find().pretty()"
```

## セキュリティメモ

このサンプルはローカル教材用ですが、公開リポジトリとして安全に読めるように以下を入れています。

- `.env.local` は `.gitignore` で除外
- MongoDB は `127.0.0.1:27017` にだけ公開
- POST/DELETE API は same-origin リクエストのみ許可
- `/api/generate` は `application/json` の小さい body のみ受付
- ユーザー入力とモデル出力は制御文字を除去し、最大長を制限
- Codex App Server は `approvalMode: "on-request"`、`sandboxMode: "read-only"`、空の `CODEX_WORKDIR` で実行
- Codex App Server から MCP/remote MCP/通知コマンドを使わない設定
- Next.js に `nosniff`、`DENY` frame、`same-origin` referrer、Permissions Policy を設定
- `npm audit` が通るよう、Next.js 内部の PostCSS は `overrides` で安全な版へ固定

## 実装の見どころ

- `src/lib/codex.ts`: Codex App Server provider を作り、`generateText()` で名言を生成
- `src/lib/validation.ts`: 入力、リクエストサイズ、same-origin、モデル出力の正規化
- `src/lib/mongodb.ts`: Next.js のホットリロードでも接続を使い回す Mongoose 接続キャッシュ
- `src/models/Quote.ts`: 名言保存用の Mongoose schema
- `src/app/api/generate/route.ts`: テーマ検証、生成、MongoDB 保存
- `src/app/api/quotes/route.ts`: 一覧取得と削除
- `src/app/page.tsx`: 入力フォーム、最新結果、履歴一覧

## よくあるエラー

### Docker daemon に接続できない

```text
Cannot connect to the Docker daemon
```

Docker Desktop が起動していません。

```bash
open -a Docker
npm run mongo:up
```

### MongoDB に接続できない

```text
MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
```

MongoDB コンテナが起動していません。

```bash
npm run mongo:up
docker ps
```

`quote-mongo` が `Up` になっていれば OK です。

### `gpt-5` や古いモデルが supported ではない

```text
The 'gpt-5' model is not supported when using Codex with a ChatGPT account.
```

Codex CLI が古いか、`CODEX_MODEL` が現在の ChatGPT アカウント認証で使えないモデルです。

```bash
codex --version
npm run codex:models
```

必要なら `.env.local` に `CODEX_PATH` を設定してください。

### `cp .env.local.example .env.local` で設定が戻った

`CODEX_PATH` などを手で直した後に再コピーすると上書きされます。初回セットアップ後は、`.env.local` を直接編集してください。

## 制約

- ローカル開発用のサンプルです。
- エンドユーザー向け SaaS として公開する構成ではありません。
- ChatGPT アカウント認証の Codex App Server を、開発者本人のローカル環境から使う前提です。
- 本番サービス化する場合は、2026-05-08時点では、OpenAI API キーを使うバックエンド構成を別途検討してください。
