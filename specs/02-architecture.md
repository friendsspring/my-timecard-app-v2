# 02. アーキテクチャ・技術選定

## 2.1 設計方針

- **無料枠最大化**: 個人利用想定で月額 0 円運用を維持する。
- **TypeScript で統一**: フロントエンド / バックエンドを Next.js + TypeScript にまとめ、コードベースを 1 リポジトリで管理する（モノレポ化はしない）。
- **マネージド優先**: 認証 / DB / ホスティングはマネージドサービスを使い、運用負荷を最小化する。
- **DB は SQL（PostgreSQL）**: 集計クエリ（プロジェクト × 月）を素直に書きたいため。

## 2.2 技術スタック

| レイヤー | 採用技術 | 採用理由 |
|---------|----------|---------|
| フレームワーク | **Next.js 15 (App Router)** | フロント / API を 1 つに統合できる。Vercel との相性が最良。 |
| 言語 | **TypeScript 5 (strict)** | 型安全 / Readme 要件 |
| ホスティング | **Vercel (Hobby Plan)** | Next.js 最適化・無料枠十分・自動 HTTPS / プレビュー URL |
| DB | **Supabase (PostgreSQL)** | 無料枠 500MB / Auth と統合済み / RLS が使える |
| 認証 | **Supabase Auth (Google Provider)** | DB と一体運用でき、サーバー側セッション扱いも容易 |
| ORM | **Drizzle ORM** | 軽量・サーバーレス向き・TypeScript 型推論が強い |
| UI ライブラリ | **Tailwind CSS v4 + shadcn/ui** | Tailwind の素のクラス + Radix ベースで質の高いコンポーネント |
| アイコン | **lucide-react** | shadcn/ui の標準 |
| 状態管理 | **React Server Components + Server Actions** + 必要箇所のみ `useState` | 単純な CRUD では十分。バンドルサイズも小さい。 |
| データ取得 | **Server Components + Server Actions** | Client コンポーネントではミューテーションのみ呼び出す |
| 日付処理 | **date-fns / date-fns-tz** | 軽量・ツリーシェイク可能 / JST 変換 |
| バリデーション | **zod** | Server Action 入力検証 |
| テスト | **vitest** + **@testing-library/react** | 軽量、設定が簡単 |
| Lint / Format | **ESLint + Prettier** (Next.js 標準) | |
| CI | **GitHub Actions**（型チェック・lint・test） | 無料 |

### 採用しないもの（候補との比較）

| 候補 | 不採用理由 |
|------|-----------|
| Firebase / Firestore | Readme は GCP 寄り希望だが、無料枠最大化（リクエスト課金あり）と SQL 集計の書きやすさを優先し Supabase に。Firebase Auth 単体採用も可能だが、Supabase で DB と統合した方がシンプル。 |
| NextAuth.js (Auth.js) | Supabase Auth で代替できる上、DB ロックインも避けられ、構成がシンプル。 |
| Prisma | サーバーレス / Edge での運用と起動時間で Drizzle の方が有利。 |
| Cloud Run | 個人用にはオーバースペック（コールドスタート、IAM 設定が増える）。 |

## 2.3 全体構成図

```
┌──────────────────────────────────────────────────────────────────┐
│ User (PC / Smartphone Browser)                                   │
└────────────────────────┬─────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ Vercel (Edge / Node Runtime)                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Next.js App Router                                         │  │
│  │  - app/  (Server / Client Components)                      │  │
│  │  - app/api/auth/callback  (Supabase Auth Callback)         │  │
│  │  - Server Actions (CRUD / 集計)                            │  │
│  └──────────────────────┬─────────────────────────────────────┘  │
└─────────────────────────┼────────────────────────────────────────┘
                          │ Supabase JS / Drizzle (Postgres wire)
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│ Supabase (Free Tier)                                             │
│  - Auth (Google OAuth)                                           │
│  - PostgreSQL (RLS 有効化)                                       │
│  - Connection Pooling (PgBouncer)                                │
└──────────────────────────────────────────────────────────────────┘
```

## 2.4 認証フロー

1. ユーザーが `/login` で「Google でログイン」をクリック。
2. Supabase Auth の OAuth リダイレクト（Google 認可画面）。
3. コールバック (`/api/auth/callback`) で Supabase が Cookie を発行。
4. サーバーコンポーネント側では `createServerClient()`（@supabase/ssr）でセッションを取得。
5. **許可メールアドレス**を環境変数 `ALLOWED_EMAILS` で定義。許可外の場合は即サインアウトして `/login?error=forbidden`。

## 2.5 データアクセス

- 書き込みは **Server Action** に集約し、内部で zod 検証 → Drizzle で書き込む。
- 読み取りは Server Component で Drizzle 経由。
- Supabase の RLS は `user_id = auth.uid()` を全テーブルに設定（多重防御）。

## 2.6 ディレクトリ構成（提案）

```
my-timecard-app-v2/
├─ specs/                       # 本仕様書群
├─ public/
├─ src/
│  ├─ app/                      # Next.js App Router
│  │  ├─ (auth)/login/page.tsx
│  │  ├─ (app)/                 # 認証必須エリア
│  │  │  ├─ layout.tsx
│  │  │  ├─ page.tsx            # ダッシュボード（タイマー）
│  │  │  ├─ projects/page.tsx
│  │  │  ├─ projects/[id]/page.tsx
│  │  │  ├─ entries/page.tsx
│  │  │  └─ summary/page.tsx
│  │  ├─ api/auth/callback/route.ts
│  │  └─ layout.tsx
│  ├─ components/
│  │  ├─ ui/                    # shadcn/ui
│  │  └─ feature/
│  ├─ lib/
│  │  ├─ supabase/
│  │  │  ├─ server.ts
│  │  │  └─ client.ts
│  │  ├─ db/
│  │  │  ├─ schema.ts          # Drizzle スキーマ
│  │  │  └─ index.ts
│  │  ├─ auth/
│  │  │  └─ guard.ts
│  │  ├─ time/
│  │  │  └─ jst.ts             # JST 変換ヘルパー
│  │  └─ billing/
│  │     └─ calc.ts            # 集計ロジック
│  ├─ actions/                 # Server Actions
│  │  ├─ projects.ts
│  │  ├─ entries.ts
│  │  └─ rates.ts
│  └─ types/
├─ drizzle/                     # マイグレーション
├─ tests/
├─ .env.example
├─ drizzle.config.ts
├─ next.config.ts
├─ package.json
├─ tsconfig.json
└─ Readme.md
```

## 2.7 環境変数

| 名前 | 説明 | 例 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 公開キー | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバー専用キー（マイグレーション時のみ） | `eyJhbGc...` |
| `DATABASE_URL` | Drizzle 用の Postgres 接続文字列（pooler） | `postgresql://...` |
| `ALLOWED_EMAILS` | カンマ区切りの許可メール | `me@example.com` |
| `NEXT_PUBLIC_APP_URL` | サイト URL | `https://my-timecard-app-v2.vercel.app` |

## 2.8 デプロイ運用

- **Git**: GitHub に push、main へのマージで自動的に Vercel 本番デプロイ。
- **Preview**: PR 単位で Preview URL（Supabase は本番と共有 or Branch 機能で分離）。
- **マイグレーション**: `drizzle-kit migrate` をローカル / CI から手動適用（個人運用なので自動化はオプション）。

## 2.9 監視・ログ

- v1 は Vercel ダッシュボードのログのみ（無料）。
- エラー追跡は将来 Sentry 無料枠を検討。

## 2.10 想定コスト

| サービス | プラン | 月額 |
|----------|--------|------|
| Vercel | Hobby | ¥0 |
| Supabase | Free | ¥0 |
| ドメイン | `vercel.app` のサブドメインを使用 | ¥0 |
| **合計** | | **¥0** |
