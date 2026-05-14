# 06. 実装タスク

仕様書承認後、以下のフェーズで進める。1 フェーズ完了ごとに動作確認できる状態を保つ。

## フェーズ 0: ユーザー作業（手動が必要）

> **コードでは作れず、あなた側で行う必要がある作業です。実装に着手する前か並行で進めてください。**

- [ ] **Supabase プロジェクト作成**（無料プラン）
  - URL / anon key / service role key / Postgres 接続文字列を取得
  - Database → Connection Pooler の URL を `DATABASE_URL` として控える
- [ ] **Google Cloud Console** で OAuth 2.0 クライアントを作成
  - 承認済みリダイレクト URI に Supabase のコールバック URL を登録
  - クライアント ID / シークレットを Supabase の Auth Provider 設定に投入
- [ ] **Vercel アカウント作成 / GitHub 連携**
- [ ] このリポジトリを GitHub に push（初回のみ）
- [ ] Vercel に環境変数を登録（`02-architecture.md` の表参照）

## フェーズ 1: プロジェクト雛形

- [ ] `npx create-next-app@latest` (App Router / TypeScript / Tailwind / src ディレクトリ / ESLint)
- [ ] `package.json` に必要パッケージ追加
  - `@supabase/supabase-js` `@supabase/ssr`
  - `drizzle-orm` `drizzle-kit` `postgres`
  - `zod` `date-fns` `date-fns-tz`
  - `lucide-react` `class-variance-authority` `clsx` `tailwind-merge`
  - dev: `vitest` `@testing-library/react` `@testing-library/dom` `jsdom` `@types/node`
- [ ] shadcn/ui を初期化（`button`, `input`, `dialog`, `select`, `card`, `dropdown-menu`, `tabs`, `badge`, `tooltip`, `sonner`, `textarea`, `label`, `popover`）
- [ ] `.env.example` / `.env.local` を整備
- [ ] `tsconfig.json` で `strict: true`、path alias `@/*`
- [ ] ESLint / Prettier / `next.config.ts` 整備
- [ ] GitHub Actions（`type-check`, `lint`, `test`）

## フェーズ 2: DB / 認証基盤

- [ ] `src/lib/db/schema.ts` を仕様通り定義
- [ ] `drizzle.config.ts`
- [ ] `drizzle-kit generate` でマイグレーション生成
- [ ] `drizzle/0001_setup_rls.sql`（RLS と部分ユニーク制約を手書き）
- [ ] Supabase に対してマイグレーション適用
- [ ] `src/lib/supabase/server.ts` / `client.ts`
- [ ] `src/lib/auth/guard.ts`（`requireUser()`）
- [ ] `app/api/auth/callback/route.ts`
- [ ] `/login` ページ（Google ボタン）
- [ ] 許可メールチェック → サインアウト
- [ ] レイアウト（保護エリアラッパー）
- [ ] サインアウト Server Action

## フェーズ 3: プロジェクト管理

- [ ] `actions/projects.ts`（list / create / update / setArchived）
- [ ] `/projects` 一覧（カード）
- [ ] 新規作成モーダル
- [ ] 編集モーダル
- [ ] アーカイブ／復元

## フェーズ 4: 打刻機能

- [ ] `actions/entries.ts`（getOpen / start / stop / createManual / update / delete / list）
- [ ] `/`（ダッシュボード）
- [ ] 進行中タイマー（クライアントコンポーネント）
- [ ] メモ自動保存（debounce）
- [ ] 直近打刻リスト
- [ ] `/entries` 月 / プロジェクトフィルター付き一覧
- [ ] 手動追加・編集・削除モーダル

## フェーズ 5: 月次レート + サマリー

- [ ] `actions/rates.ts`（upsert / delete）
- [ ] `/projects/[id]` の月次レートセクション
- [ ] `src/lib/billing/calc.ts`（純粋関数で集計）
- [ ] `getMonthlySummary` Server Function
- [ ] `/summary` 画面（月セレクタ・カード一覧・合計）
- [ ] サマリーから `/entries` へのドリルダウン

## フェーズ 5.5: 請求先・請求書 PDF

- [ ] `billing_clients` テーブル追加、`projects.billing_client_id` マイグレーション + RLS
- [ ] `actions/billing-clients.ts`（list / create / update / delete）
- [ ] `src/lib/billing/invoice.ts`（税計算・按分・プレースホルダ。`07-invoicing.md` 準拠）
- [ ] `getInvoicePreview`（Server Function または内部関数）
- [ ] PDF 生成（Route Handler 推奨: `app/api/invoices/pdf/route.ts`、`runtime = 'nodejs'`）または同等
- [ ] `/billing` 一覧・モーダル（作成 / 編集）
- [ ] `/billing/[clientId]/invoice`（月次プレビュー + ダウンロード）
- [ ] `/projects`・`/projects/[id]` に請求先セレクト追加
- [ ] `invoice.test.ts`（外税・内税按分・0 件警告フラグ）

## フェーズ 6: 仕上げ

- [ ] レスポンシブ調整（PC / SP）
- [ ] ダーク／ライトモード切替
- [ ] 空状態のメッセージ
- [ ] エラーバウンダリ・トースト
- [ ] Lighthouse チェック（80 点以上）
- [ ] Readme.md（v2 用）の更新（セットアップ手順）

## フェーズ 7: テスト

- [ ] `lib/billing/calc.test.ts`（月境界 / 月次レート切替 / 進行中除外 / 月またぎ）
- [ ] `lib/time/jst.test.ts`（JST↔UTC 変換）
- [ ] `actions/entries` の重要なバリデーション

## フェーズ 8: デプロイ

- [ ] Vercel に GitHub リポジトリを接続
- [ ] 環境変数登録
- [ ] 本番デプロイ
- [ ] スマホ・PC で動作確認

## 完了の定義（DoD）

- 受け入れ基準（`01-requirements.md` 1.8）をすべて満たすこと。
- 請求ロジックは **`07-invoicing.md` と単体テストで一致**していること。
- 主要 Server Action が zod 検証 + エラーハンドリングを備えていること。
- マイグレーションが `drizzle/` 配下にコミットされていること。
- README に「ローカル起動手順 / Supabase 接続手順 / デプロイ手順」が書かれていること。
