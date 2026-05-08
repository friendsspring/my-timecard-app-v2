"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, gt, isNull, lt, or } from "drizzle-orm";
import { z } from "zod";

import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { fail, ok, validationFail, type ActionResult } from "@/lib/actions/result";
import { jstMonthRangeToUtc } from "@/lib/time/jst";

const idSchema = z.string().uuid();

const startSchema = z.object({
  projectId: z.string().uuid(),
  memo: z
    .string()
    .max(2000, "メモは2000文字以内で入力してください")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

const manualSchema = z
  .object({
    projectId: z.string().uuid(),
    startedAt: z.coerce.date({ invalid_type_error: "開始時刻が不正です" }),
    endedAt: z.coerce.date({ invalid_type_error: "終了時刻が不正です" }),
    memo: z
      .string()
      .max(2000, "メモは2000文字以内で入力してください")
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
  })
  .refine((v) => v.endedAt > v.startedAt, {
    message: "終了時刻は開始時刻より後の値を指定してください",
    path: ["endedAt"],
  });

const updateSchema = z
  .object({
    id: z.string().uuid(),
    projectId: z.string().uuid().optional(),
    startedAt: z.coerce.date().optional(),
    endedAt: z.coerce.date().nullable().optional(),
    memo: z.string().max(2000).optional().nullable(),
  })
  .refine(
    (v) => {
      if (v.startedAt && v.endedAt) {
        return v.endedAt > v.startedAt;
      }
      return true;
    },
    { message: "終了時刻は開始時刻より後の値を指定してください", path: ["endedAt"] },
  );

export async function getOpenEntry() {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(schema.timeEntries)
    .where(
      and(
        eq(schema.timeEntries.userId, user.id),
        isNull(schema.timeEntries.endedAt),
        isNull(schema.timeEntries.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function startEntry(input: {
  projectId: string;
  memo?: string;
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) {
    return validationFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const open = await getOpenEntry();
  if (open) {
    return fail({ code: "ALREADY_OPEN", message: "進行中の打刻があります。先に終了してください。" });
  }

  try {
    const [row] = await db
      .insert(schema.timeEntries)
      .values({
        userId: user.id,
        projectId: parsed.data.projectId,
        startedAt: new Date(),
        memo: parsed.data.memo ?? null,
        source: "live",
      })
      .returning({ id: schema.timeEntries.id });
    revalidatePath("/dashboard");
    revalidatePath("/entries");
    revalidatePath("/summary");
    return ok({ id: row!.id });
  } catch (e) {
    console.error("startEntry failed", e);
    return fail({ code: "INTERNAL_ERROR", message: "打刻の開始に失敗しました" });
  }
}

export async function stopEntry(input?: {
  id?: string;
  endedAt?: Date | string;
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();

  const target = input?.id
    ? await db
        .select()
        .from(schema.timeEntries)
        .where(
          and(
            eq(schema.timeEntries.id, input.id),
            eq(schema.timeEntries.userId, user.id),
            isNull(schema.timeEntries.endedAt),
            isNull(schema.timeEntries.deletedAt),
          ),
        )
        .limit(1)
        .then((rows) => rows[0] ?? null)
    : await getOpenEntry();

  if (!target) {
    return fail({ code: "NOT_FOUND", message: "対象の進行中エントリが見つかりません" });
  }

  const endedAt = input?.endedAt ? new Date(input.endedAt) : new Date();
  if (!(endedAt > target.startedAt)) {
    return validationFail({ endedAt: ["終了時刻は開始時刻より後の値を指定してください"] });
  }

  try {
    await db
      .update(schema.timeEntries)
      .set({ endedAt, updatedAt: new Date() })
      .where(eq(schema.timeEntries.id, target.id));
    revalidatePath("/dashboard");
    revalidatePath("/entries");
    revalidatePath("/summary");
    return ok({ id: target.id });
  } catch (e) {
    console.error("stopEntry failed", e);
    return fail({ code: "INTERNAL_ERROR", message: "打刻の終了に失敗しました" });
  }
}

export async function createManualEntry(input: {
  projectId: string;
  startedAt: Date | string;
  endedAt: Date | string;
  memo?: string;
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = manualSchema.safeParse(input);
  if (!parsed.success) {
    return validationFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  try {
    const [row] = await db
      .insert(schema.timeEntries)
      .values({
        userId: user.id,
        projectId: parsed.data.projectId,
        startedAt: parsed.data.startedAt,
        endedAt: parsed.data.endedAt,
        memo: parsed.data.memo ?? null,
        source: "manual",
      })
      .returning({ id: schema.timeEntries.id });
    revalidatePath("/dashboard");
    revalidatePath("/entries");
    revalidatePath("/summary");
    return ok({ id: row!.id });
  } catch (e) {
    console.error("createManualEntry failed", e);
    return fail({ code: "INTERNAL_ERROR", message: "打刻の追加に失敗しました" });
  }
}

export async function updateEntry(input: {
  id: string;
  projectId?: string;
  startedAt?: Date | string;
  endedAt?: Date | string | null;
  memo?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return validationFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  try {
    const result = await db
      .update(schema.timeEntries)
      .set({
        ...(parsed.data.projectId ? { projectId: parsed.data.projectId } : {}),
        ...(parsed.data.startedAt ? { startedAt: parsed.data.startedAt } : {}),
        ...(parsed.data.endedAt !== undefined ? { endedAt: parsed.data.endedAt } : {}),
        ...(parsed.data.memo !== undefined ? { memo: parsed.data.memo } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.timeEntries.id, parsed.data.id),
          eq(schema.timeEntries.userId, user.id),
          isNull(schema.timeEntries.deletedAt),
        ),
      )
      .returning({ id: schema.timeEntries.id });
    if (result.length === 0) {
      return fail({ code: "NOT_FOUND", message: "対象が見つかりません" });
    }
    revalidatePath("/dashboard");
    revalidatePath("/entries");
    revalidatePath("/summary");
    return ok({ id: parsed.data.id });
  } catch (e) {
    console.error("updateEntry failed", e);
    return fail({ code: "INTERNAL_ERROR", message: "打刻の更新に失敗しました" });
  }
}

export async function updateEntryMemo(input: {
  id: string;
  memo: string | null;
}): Promise<ActionResult<{ id: string }>> {
  return updateEntry({ id: input.id, memo: input.memo });
}

export async function deleteEntry(input: { id: string }): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const idCheck = idSchema.safeParse(input.id);
  if (!idCheck.success) return fail({ code: "NOT_FOUND", message: "対象が見つかりません" });

  try {
    const result = await db
      .update(schema.timeEntries)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(schema.timeEntries.id, idCheck.data),
          eq(schema.timeEntries.userId, user.id),
          isNull(schema.timeEntries.deletedAt),
        ),
      )
      .returning({ id: schema.timeEntries.id });
    if (result.length === 0) {
      return fail({ code: "NOT_FOUND", message: "対象が見つかりません" });
    }
    revalidatePath("/dashboard");
    revalidatePath("/entries");
    revalidatePath("/summary");
    return ok({ id: idCheck.data });
  } catch (e) {
    console.error("deleteEntry failed", e);
    return fail({ code: "INTERNAL_ERROR", message: "打刻の削除に失敗しました" });
  }
}

export type EntryListFilter = {
  yearMonth?: string;
  projectId?: string;
  limit?: number;
};

export type EntryWithProject = schema.TimeEntry & {
  project: { id: string; name: string; color: string };
};

export async function listEntries(filter: EntryListFilter = {}): Promise<EntryWithProject[]> {
  const user = await requireUser();

  const conds = [
    eq(schema.timeEntries.userId, user.id),
    isNull(schema.timeEntries.deletedAt),
  ];

  if (filter.yearMonth) {
    const { start, end } = jstMonthRangeToUtc(filter.yearMonth);
    // 進行中含む: started_at < end かつ (ended_at is null or ended_at > start)
    conds.push(lt(schema.timeEntries.startedAt, end));
    conds.push(
      or(
        isNull(schema.timeEntries.endedAt),
        gt(schema.timeEntries.endedAt, start),
      )!,
    );
  }
  if (filter.projectId) {
    conds.push(eq(schema.timeEntries.projectId, filter.projectId));
  }

  const rows = await db
    .select({
      entry: schema.timeEntries,
      project: {
        id: schema.projects.id,
        name: schema.projects.name,
        color: schema.projects.color,
      },
    })
    .from(schema.timeEntries)
    .innerJoin(schema.projects, eq(schema.timeEntries.projectId, schema.projects.id))
    .where(and(...conds))
    .orderBy(desc(schema.timeEntries.startedAt))
    .limit(filter.limit ?? 100);

  return rows.map((r) => ({ ...r.entry, project: r.project }));
}

export async function listRecentEntries(limit = 10): Promise<EntryWithProject[]> {
  return listEntries({ limit });
}
