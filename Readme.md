# My Timecard (個人用タイムカードアプリ)

複数プロジェクトに対応した、自分専用のタイムカードアプリ。
リアルタイム打刻＋手動入力に対応し、月次でプロジェクトごとの稼働時間と請求額（時給 × 稼働時間）を確認できます。

スマホ・PC のブラウザから利用でき、Vercel + Supabase の **無料枠** で運用することを想定しています。

## 機能

- Google ログイン（許可メールリスト方式）
- プロジェクト管理（作成・編集・アーカイブ、カラー、既定時給、メモ）
- 打刻（リアルタイム start/stop、手動追加、編集、削除、メモ自動保存）
- 月次レート（プロジェクト × 年月の時給上書き）
- 月次サマリー（プロジェクト別の稼働時間・請求額・合計）
- レスポンシブ UI（PC / スマホ両対応、ライト/ダーク自動）

## アーキテクチャ

| 技術 | 役割 |
|------|------|
| **Next.js 16 (App Router)** | フロント・バックエンド統合 |
| **TypeScript (strict)** | 言語 |
| **Tailwind CSS + shadcn/ui** | UI |
| **Supabase Auth (Google)** | 認証 |
| **Supabase PostgreSQL** | DB（RLS で本人のレコードのみアクセス可） |
| **Drizzle ORM** | スキーマ・型・マイグレーション |
| **zod** | Server Action 入力検証 |
| **Vitest** | 単体テスト |
| **Vercel** | ホスティング |

詳細は [`specs/02-architecture.md`](./specs/02-architecture.md) を参照。

## ドキュメント

仕様書駆動で開発しています。要件・設計・実装タスクは [`specs/`](./specs/) を参照してください。

- `specs/01-requirements.md` 要件
- `specs/02-architecture.md` アーキテクチャ
- `specs/03-data-model.md` データモデル
- `specs/04-api-design.md` API/Server Action 設計
- `specs/05-ui-design.md` UI 設計
- `specs/06-tasks.md` 実装タスク

## セットアップ

### 1. 前提

- Node.js 20.19+ または 22.13+ （推奨: 22 LTS）
- npm 10+
- Supabase アカウント（無料）
- Google Cloud Console（OAuth クライアント作成のため）
- Vercel アカウント（デプロイする場合）

### 2. リポジトリの取得 / 依存パッケージ

```bash
git clone <this-repo>
cd my-timecard-app-v2
npm install
```

### 3. Supabase プロジェクトを作成

1. [Supabase Dashboard](https://supabase.com/dashboard) で新規プロジェクトを作成
   - **Region は `Tokyo (ap-northeast-1)` を選択**（後述の「リージョン構成」参照。無料プランは作成後の変更不可）
2. **Project Settings → API** から取得
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Project Settings → Database → Connection pooling (Transaction mode)** から取得
   - `Connection string` → `DATABASE_URL`（パスワードは置き換える）

### 4. Google OAuth の設定

1. [Google Cloud Console](https://console.cloud.google.com/) で OAuth 2.0 クライアント ID を作成
2. **承認済みリダイレクト URI** に Supabase のコールバックを登録:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. クライアント ID / シークレットを Supabase の **Authentication → Providers → Google** に登録して有効化

### 5. 環境変数

`.env.example` を `.env.local` にコピーして埋める。

```bash
cp .env.example .env.local
```

| 変数 | 説明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `DATABASE_URL` | Postgres 接続文字列（Transaction Pooler 推奨） |
| `ALLOWED_EMAILS` | カンマ区切りの許可メール（自分のアドレスのみ） |
| `NEXT_PUBLIC_APP_URL` | サイト URL（ローカルでは `http://localhost:3000`） |

### 6. データベースのマイグレーション

```bash
# 1) Drizzle のマイグレーションを Supabase に適用
npm run db:migrate

# 2) RLS とポリシーを適用（手書きSQL）
# Supabase ダッシュボードの SQL Editor で
# drizzle/0001_setup_rls.sql の内容を貼り付けて実行
```

### 7. ローカル起動

```bash
npm run dev
# http://localhost:3000 を開く
```

## スクリプト

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番モード起動 |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript 型チェック |
| `npm run test` | 単体テスト（Vitest） |
| `npm run test:watch` | テスト watch モード |
| `npm run db:generate` | スキーマからマイグレーションを生成 |
| `npm run db:migrate` | DB にマイグレーションを適用 |
| `npm run db:studio` | Drizzle Studio を起動 |

## デプロイ（Vercel）

1. このリポジトリを GitHub に push
2. [Vercel](https://vercel.com/) で新規プロジェクトを作り、上記リポジトリを連携
3. 環境変数を Vercel の Project Settings → Environment Variables に登録（`.env.example` の全項目）
4. `NEXT_PUBLIC_APP_URL` は Vercel が払い出した URL（例: `https://my-timecard-app-v2.vercel.app`）を設定
   （環境変数を変更後は再デプロイが必要:Deployments -> ... -> ReDeploy -> キャッシュは使わない）
5. Google Cloud Console の OAuth クライアントの「承認済みリダイレクト URI」が Supabase 側のままで OK
   （Supabase 経由なのでアプリの URL が変わってもリダイレクト URI は変わりません）

### デプロイ時の注意点
- ログイン後のリダイレクト先がlocalhostになってしまう
   - Vercelの環境変数で`NEXT_PUBLIC_APP_URL`がlocalhostになっている
   - Supabaseの`Site URL`がlocalhostになっている（Project > Authentication > URL Configuration）
      - localhostも許可したい場合は、`Redirect URLs`に定義する

- レスポンスが遅い場合 → **Vercel と Supabase のリージョンを Tokyo に揃える**
   - Supabaseのリージョンを確認（日本になっているか）
      - `DATABASE_URL` のホスト名で判別: `ap-northeast-1` = 東京、`ap-southeast-1` = シンガポール、`us-east-1` = 米国
      - 無料プランは作成後の変更不可。違っていればプロジェクト作り直し
   - Vercelのリージョンを確認（日本になっているか）
      - Project → Settings → Functions → Function Region で `Tokyo, Japan (hnd1)` を選択
      - 変更後は Deployments → Redeploy（Build Cache はオフ推奨）で反映
   - 影響度の目安: 米国 ↔ シンガポール構成では Server Action 1 回あたり 300〜500ms の追加遅延、揃えれば数十 ms

## ディレクトリ構成

```
my-timecard-app-v2/
├─ specs/                  # 仕様書（要件・設計）
├─ drizzle/                # マイグレーション SQL
│  ├─ 0000_init.sql
│  └─ 0001_setup_rls.sql   # RLS 用（手動適用）
├─ src/
│  ├─ app/
│  │  ├─ (app)/            # 認証必須エリア（ダッシュボード等）
│  │  ├─ login/            # ログイン
│  │  └─ api/auth/         # Supabase OAuth コールバック / signout
│  ├─ actions/             # Server Actions
│  │  ├─ projects.ts
│  │  ├─ entries.ts
│  │  ├─ rates.ts
│  │  └─ summary.ts
│  ├─ components/ui/       # shadcn/ui ベースの UI
│  ├─ lib/
│  │  ├─ db/               # Drizzle スキーマ / クライアント
│  │  ├─ supabase/         # Supabase Auth クライアント
│  │  ├─ auth/             # 認証ガード・許可メール
│  │  ├─ time/jst.ts       # JST 変換
│  │  ├─ format.ts         # 通貨・期間フォーマット
│  │  ├─ billing/calc.ts   # 月次集計（純粋関数）
│  │  └─ actions/result.ts # ActionResult 型
│  └─ app/(app)/_nav.tsx
├─ tests/
│  ├─ jst.test.ts
│  └─ billing-calc.test.ts
└─ ...
```

## ライセンス

Private / Personal Use.
