# 04. API / Server Action 設計

Next.js App Router の **Server Actions** を主要な書き込み手段として使う。
読み取りは Server Component から DB を直接呼ぶ。

## 4.1 共通ルール

- すべての Server Action は実行前に `requireUser()` を呼び、未ログインなら `redirect('/login')`。
- 入力は必ず `zod` で検証する。失敗時は `{ ok: false, error: { code, message, fieldErrors } }` を返す。
- 成功時は `{ ok: true, data }`。
- ミューテーション後は `revalidatePath()` で関連ページを再描画。
- 例外は捕捉してログに残し、ユーザーには汎用メッセージのみ返す。

```ts
// 共通レスポンス型
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]> } };
```

## 4.2 認証

| ルート | メソッド | 説明 |
|--------|----------|------|
| `/login` | GET | Google ログインボタンを表示 |
| `/api/auth/callback` | GET | Supabase OAuth コールバック |
| `/api/auth/signout` | POST | サインアウトしてセッション破棄 |

許可メールチェックはコールバック内で実施。許可外なら `signOut()` → `/login?error=forbidden`。

## 4.3 プロジェクト

### 4.3.1 一覧（読み取り）
- 関数: `listProjects({ includeArchived?: boolean })`
- 返り値: `Project[]`
- 並び順: `archived_at NULLS FIRST, name ASC`

### 4.3.2 作成 — `createProject`

**入力 (zod)**
```ts
z.object({
  name: z.string().trim().min(1).max(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
  defaultHourlyRate: z.coerce.number().int().min(0).max(1_000_000),
  note: z.string().max(2000).optional(),
  billingClientId: z.string().uuid().nullable().optional(),
});
```

**動作**: `user_id = auth.uid()` で挿入。`revalidatePath('/projects')`。

### 4.3.3 更新 — `updateProject`
- 入力: `4.3.2` の zod + `id`（`billingClientId` は **未指定なら変更なし**。`null` を明示すれば請求先未割当に戻す）。
- 自分の所有 project に限る（RLS で保証）。
- `billingClientId` が非 NULL のとき、**同ユーザーの `billing_clients` に存在**することを検証。違反時は `VALIDATION_ERROR`。

### 4.3.4 アーカイブ／復元 — `setProjectArchived`
- 入力: `{ id, archived: boolean }`
- `archived_at = archived ? now() : null`

### 4.3.5 削除 — v1 では不可
- 過去打刻を保つためアーカイブのみ提供。

## 4.4 打刻 (TimeEntry)

### 4.4.1 進行中エントリ取得
- 関数: `getOpenEntry()`
- 返り値: `TimeEntry | null`

### 4.4.2 開始 — `startEntry`

**入力**
```ts
z.object({
  projectId: z.string().uuid(),
  memo: z.string().max(2000).optional(),
});
```

**動作**:
1. 既存の open entry があれば `error.code = "ALREADY_OPEN"` を返す。
2. `started_at = now()`, `source = 'live'` で挿入。
3. `revalidatePath('/')`.

### 4.4.3 終了 — `stopEntry`

**入力**: `{ id?: string, endedAt?: Date }`（省略時は現在の open entry を `now()` で終了）。
**バリデーション**: `endedAt > started_at`。
**動作**: `ended_at` を更新。

### 4.4.4 手動追加 — `createManualEntry`

**入力**
```ts
z.object({
  projectId: z.string().uuid(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date(),
  memo: z.string().max(2000).optional(),
}).refine(v => v.endedAt > v.startedAt, { message: "終了は開始より後の時刻を指定してください" });
```

**動作**: `source = 'manual'` で挿入。

### 4.4.5 編集 — `updateEntry`

**入力**: `id` + 任意の `projectId / startedAt / endedAt / memo`。
**バリデーション**: 進行中でなければ `endedAt > startedAt`。

### 4.4.6 削除 — `deleteEntry`
- ソフトデリート（`deleted_at = now()`）。

### 4.4.7 一覧取得（読み取り）
- 関数: `listEntries({ yearMonth?, projectId?, limit?, cursor? })`
- 返り値: `TimeEntry[] + nextCursor`
- 並び順: `started_at DESC`

## 4.5 月次レート

### 4.5.1 取得
- 関数: `getMonthlyRates({ yearMonth })` → `Map<projectId, hourlyRate>`

### 4.5.2 設定 — `upsertMonthlyRate`

**入力**
```ts
z.object({
  projectId: z.string().uuid(),
  yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  hourlyRate: z.coerce.number().int().min(0).max(1_000_000),
});
```

**動作**: `(project_id, year_month)` の UNIQUE で `INSERT ... ON CONFLICT DO UPDATE`。

### 4.5.3 削除 — `deleteMonthlyRate`
- 入力: `{ projectId, yearMonth }`

## 4.6 月次サマリー（読み取り）

- 関数: `getMonthlySummary({ yearMonth })`
- 返り値:
```ts
type MonthlySummary = {
  yearMonth: string;
  totalHours: number;
  totalAmount: number;
  perProject: Array<{
    projectId: string;
    projectName: string;
    color: string;
    hours: number;
    appliedRate: number;
    rateSource: "default" | "monthly";
    amount: number;
    entriesCount: number;
  }>;
};
```

実装は集計用 SQL を 1 本書いて、JST の月境界で UTC に変換した範囲でオーバーラップ計算する。
（PoC 段階では Server Action 内で TS 計算でも可。`src/lib/billing/calc.ts` に切り出してテスト可能にする。）

## 4.7 請求先 (Billing Client)

### 4.7.1 一覧（読み取り）
- 関数: `listBillingClients()`
- 並び順: `name ASC`

### 4.7.2 作成 — `createBillingClient`

**入力 (zod)**
```ts
z.object({
  name: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(500),
  issuerName: z.string().trim().min(1).max(120),
  taxMode: z.enum(["inclusive", "exclusive"]),
  pdfFilenameTemplate: z.string().trim().min(1).max(200).default("{YYYYMM}_{CLIENT}.pdf"),
  bankInfo: z.string().max(4000).optional(),
  note: z.string().max(2000).optional(),
});
```

### 4.7.3 更新 — `updateBillingClient`
- 上記フィールド + `id`（UUID）。

### 4.7.4 削除 — `deleteBillingClient`
- 入力: `{ id }`
- **参照中の `projects.billing_client_id` は `ON DELETE SET NULL`** で未割当になる（DB 定義）。削除前に UI で確認。

## 4.8 請求書 PDF

### 4.8.1 プレビュー用データ（読み取り、任意）
- 関数: `getInvoicePreview({ billingClientId, yearMonth })`
- 返り値: 明細行（プロジェクト名 / 時間 / `line_base`）、税モード別の `S` / `tax` / `T`、置換済み件名、請求日（JST 末日）、警告フラグ（対象プロジェクト 0 件など）。
- 実装は `src/lib/billing/invoice.ts`（純粋関数＋ DB 読込）に寄せ、`07-invoicing.md` と突合テスト可能にする。

### 4.8.2 PDF 生成 — `downloadInvoicePdf`（または Route Handler）

**入力**
```ts
z.object({
  billingClientId: z.string().uuid(),
  yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});
```

**動作**:
1. `getInvoicePreview` と同等の入力整合性を確認。
2. PDF バイナリを生成（推奨: **サーバー上**で `@react-pdf/renderer` または `pdf-lib` 等。Edge で非対応なら **`nodejs` runtime 明示**）。
3. レスポンスとして `Content-Disposition: attachment; filename="..."`。**`filename` は請求先の `pdf_filename_template` をトークン展開**し、危険文字を除去（`07-invoicing.md`）。
4. ボディは `application/pdf`。

**Client 側**: `<a download>` は cross-origin で効かない場合があるため、**Blob URL** または **フォーム POST → 新規タブ**等の一般的パターンに従う（実装タスクで確定）。

## 4.9 エラーコード一覧

| code | 意味 | HTTP 相当 |
|------|------|-----------|
| `UNAUTHORIZED` | 未ログイン | 401 |
| `FORBIDDEN` | 許可外メール / 他人のリソース | 403 |
| `NOT_FOUND` | リソースが見つからない | 404 |
| `VALIDATION_ERROR` | 入力検証失敗 | 422 |
| `ALREADY_OPEN` | 進行中エントリが既に存在 | 409 |
| `INTERNAL_ERROR` | サーバー内部エラー | 500 |
