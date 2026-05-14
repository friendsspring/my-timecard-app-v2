# 03. データモデル

## 3.1 ER 図（概念）

```
┌──────────────┐     *     ┌──────────────┐
│ billing_     │◄───────────│ projects     │───*──┐
│ clients      │  user_id  │              │      │
└──────────────┘   FK      └──────────────┘      │
       ▲                      │     *             │
       │                      ├── time_entries     │
       │                      └── monthly_rates    │
       │ user_id                                  │
┌──────────────┐                                  │
│ auth.users   │──────────────────────────────────┘
│ (Supabase)   │
└──────────────┘
```

- `auth.users` は Supabase が管理する組み込みテーブル。
- アプリ側で持つテーブルはすべて `user_id` (uuid) を持ち、Row Level Security で本人のレコードのみアクセス可能（`billing_clients` 含む）。
- `projects.billing_client_id` は **任意**。同一ユーザーの請求先のみを参照するよう、アプリ層で検証する（参照先が他ユーザーの行にならないこと）。

## 3.2 テーブル定義

### 3.2.0 `billing_clients`

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | uuid | PK, default `gen_random_uuid()` | 請求先 ID |
| `user_id` | uuid | NOT NULL, FK → `auth.users(id)` | 所有者 |
| `name` | text | NOT NULL, length 1..120 | 請求先名（宛先） |
| `subject` | text | NOT NULL, length 1..500 | 件名（`{YYYYMM}` 等のプレースホルダ可、`07-invoicing.md`） |
| `issuer_name` | text | NOT NULL, length 1..120 | 請求元の名前 |
| `tax_mode` | text | NOT NULL, CHECK (`'inclusive'`, `'exclusive'`) | 内税 / 外税 |
| `pdf_filename_template` | text | NOT NULL | PDF 保存時のファイル名パターン。デフォルト `{YYYYMM}_{CLIENT}.pdf` 想定 |
| `bank_info` | text | NULL | 振込先（任意） |
| `note` | text | NULL | 備考（v1 では PDF 未印字でも可） |
| `created_at` | timestamptz | NOT NULL, default `now()` | |
| `updated_at` | timestamptz | NOT NULL, default `now()` | |

**Index**: `(user_id, name)`（一覧用）。

**RLS**:
```sql
CREATE POLICY "own_billing_clients" ON billing_clients
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### 3.2.1 `projects`

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | uuid | PK, default `gen_random_uuid()` | プロジェクト ID |
| `user_id` | uuid | NOT NULL, FK → `auth.users(id)` | 所有者 |
| `name` | text | NOT NULL, length 1..80 | 表示名 |
| `color` | text | NOT NULL, default `'#6366f1'` | UI 用のカラー（HEX） |
| `default_hourly_rate` | integer | NOT NULL, ≥ 0 | 既定時給（JPY/h、整数） |
| `note` | text | NULL | 補足メモ |
| `billing_client_id` | uuid | NULL, FK → `billing_clients(id)` ON DELETE SET NULL | 請求先。NULL なら未割当 |
| `archived_at` | timestamptz | NULL | アーカイブ日時。NULL なら有効。 |
| `created_at` | timestamptz | NOT NULL, default `now()` | 作成日時 |
| `updated_at` | timestamptz | NOT NULL, default `now()` | 更新日時 |

**Index**: `(user_id, archived_at)` 部分インデックス。
**RLS**:
```sql
CREATE POLICY "own_projects" ON projects
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### 3.2.2 `time_entries`

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | uuid | PK | 打刻 ID |
| `user_id` | uuid | NOT NULL | 所有者 |
| `project_id` | uuid | NOT NULL, FK → `projects(id)` ON DELETE RESTRICT | 所属プロジェクト |
| `started_at` | timestamptz | NOT NULL | 開始時刻（UTC 保存） |
| `ended_at` | timestamptz | NULL | 終了時刻。NULL なら進行中。 |
| `memo` | text | NULL | 作業メモ |
| `source` | text | NOT NULL, CHECK (`'live'`,`'manual'`) | リアルタイム or 手動 |
| `created_at` | timestamptz | NOT NULL, default `now()` |  |
| `updated_at` | timestamptz | NOT NULL, default `now()` |  |
| `deleted_at` | timestamptz | NULL | ソフトデリート日時 |

**制約**:
- `CHECK (ended_at IS NULL OR ended_at > started_at)`
- 進行中の重複防止: 部分ユニーク制約
  ```sql
  CREATE UNIQUE INDEX one_open_entry_per_user
    ON time_entries (user_id)
    WHERE ended_at IS NULL AND deleted_at IS NULL;
  ```

**Index**:
- `(user_id, started_at DESC)`
- `(project_id, started_at DESC)`

**RLS**: `user_id = auth.uid()`。

### 3.2.3 `monthly_rates`

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | uuid | PK | |
| `user_id` | uuid | NOT NULL | |
| `project_id` | uuid | NOT NULL, FK → `projects(id)` ON DELETE CASCADE | |
| `year_month` | text | NOT NULL, regex `^\d{4}-(0[1-9]\|1[0-2])$` | "2026-05" |
| `hourly_rate` | integer | NOT NULL, ≥ 0 | その月の上書き時給（JPY/h） |
| `created_at` | timestamptz | NOT NULL, default `now()` | |
| `updated_at` | timestamptz | NOT NULL, default `now()` | |

**制約**: `UNIQUE(project_id, year_month)`。
**RLS**: `user_id = auth.uid()`。

> 月次レートが存在しない月は `projects.default_hourly_rate` を適用する。

## 3.3 集計ロジック仕様

入力: `userId`, `yearMonth (YYYY-MM)`, `tz = 'Asia/Tokyo'`。

1. JST の `yearMonth` の月初〜月末を `[startUtc, endUtc)` として算出。
2. 当該ユーザーの `time_entries` のうち以下を対象:
   - `deleted_at IS NULL`
   - `ended_at IS NOT NULL`（進行中は除く）
   - `started_at < endUtc AND ended_at > startUtc`（オーバーラップ）
3. 各エントリの「月内時間」を計算:
   ```
   overlapMs = min(endUtc, ended_at) - max(startUtc, started_at)
   ```
4. プロジェクト単位で `Σ overlapMs` を時間に変換。
5. 該当月の `monthly_rates` があれば適用、なければ `projects.default_hourly_rate`。
6. `amount = round(hours * rate)`（円未満は四捨五入）。

> エッジケース：
> - 月をまたぐ打刻は両月にそれぞれ案分。
> - 進行中エントリは集計対象外。
> - アーカイブ済みプロジェクトでも、その月に稼働があれば結果に含める。

## 3.4 請求書用の集計

- 対象プロジェクト集合: `billing_client_id = :clientId` かつ当該ユーザーの `projects`。
- 各行の `hours`・`line_base`（課税標準）は **3.3 と同一手順**で算出する。
- 税・合計・明細の税込按分・PDF 体裁は **`07-invoicing.md` に従う**（DB テーブルは追加しない。都度計算）。

## 3.5 マイグレーション戦略

- `drizzle-kit generate` で SQL を生成し、`drizzle/` にコミット。
- 適用は `drizzle-kit migrate`（環境変数 `DATABASE_URL` を使用）。
- RLS と部分ユニーク制約は手書き SQL で `drizzle/0001_setup_rls.sql` 等として併存させる。

## 3.6 TypeScript 型定義（抜粋）

```ts
// src/lib/db/schema.ts （Drizzle 想定の概形）
export const billingClients = pgTable("billing_clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  issuerName: text("issuer_name").notNull(),
  taxMode: text("tax_mode", { enum: ["inclusive", "exclusive"] }).notNull(),
  pdfFilenameTemplate: text("pdf_filename_template").notNull(),
  bankInfo: text("bank_info"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  defaultHourlyRate: integer("default_hourly_rate").notNull(),
  note: text("note"),
  billingClientId: uuid("billing_client_id").references(() => billingClients.id, {
    onDelete: "set null",
  }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const timeEntries = pgTable("time_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  memo: text("memo"),
  source: text("source", { enum: ["live", "manual"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const monthlyRates = pgTable("monthly_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  yearMonth: text("year_month").notNull(),
  hourlyRate: integer("hourly_rate").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```
