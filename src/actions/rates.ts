"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { fail, ok, validationFail, type ActionResult } from "@/lib/actions/result";

const yearMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

const upsertSchema = z.object({
  projectId: z.string().uuid(),
  yearMonth: z.string().regex(yearMonthRegex, "年月の形式が不正です"),
  hourlyRate: z.coerce
    .number({ invalid_type_error: "整数を入力してください" })
    .int("整数で入力してください")
    .min(0, "0以上で入力してください")
    .max(1_000_000, "1,000,000以下で入力してください"),
});

export async function listMonthlyRates(projectId: string) {
  const user = await requireUser();
  return db
    .select()
    .from(schema.monthlyRates)
    .where(
      and(
        eq(schema.monthlyRates.userId, user.id),
        eq(schema.monthlyRates.projectId, projectId),
      ),
    )
    .orderBy(schema.monthlyRates.yearMonth);
}

export async function upsertMonthlyRate(input: {
  projectId: string;
  yearMonth: string;
  hourlyRate: number | string;
}): Promise<ActionResult<{ projectId: string; yearMonth: string }>> {
  const user = await requireUser();
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) {
    return validationFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  // 自分のプロジェクトであるか確認
  const owned = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, parsed.data.projectId),
        eq(schema.projects.userId, user.id),
      ),
    )
    .limit(1);
  if (owned.length === 0) {
    return fail({ code: "NOT_FOUND", message: "プロジェクトが見つかりません" });
  }

  try {
    await db
      .insert(schema.monthlyRates)
      .values({
        userId: user.id,
        projectId: parsed.data.projectId,
        yearMonth: parsed.data.yearMonth,
        hourlyRate: parsed.data.hourlyRate,
      })
      .onConflictDoUpdate({
        target: [schema.monthlyRates.projectId, schema.monthlyRates.yearMonth],
        set: { hourlyRate: parsed.data.hourlyRate, updatedAt: new Date() },
      });
    revalidatePath(`/projects/${parsed.data.projectId}`);
    revalidatePath("/summary");
    revalidatePath("/dashboard");
    return ok({ projectId: parsed.data.projectId, yearMonth: parsed.data.yearMonth });
  } catch (e) {
    console.error("upsertMonthlyRate failed", e);
    return fail({ code: "INTERNAL_ERROR", message: "月次レートの保存に失敗しました" });
  }
}

export async function deleteMonthlyRate(input: {
  projectId: string;
  yearMonth: string;
}): Promise<ActionResult<{ projectId: string; yearMonth: string }>> {
  const user = await requireUser();
  if (!yearMonthRegex.test(input.yearMonth)) {
    return validationFail({ yearMonth: ["年月の形式が不正です"] });
  }

  try {
    await db
      .delete(schema.monthlyRates)
      .where(
        and(
          eq(schema.monthlyRates.userId, user.id),
          eq(schema.monthlyRates.projectId, input.projectId),
          eq(schema.monthlyRates.yearMonth, input.yearMonth),
        ),
      );
    revalidatePath(`/projects/${input.projectId}`);
    revalidatePath("/summary");
    return ok({ projectId: input.projectId, yearMonth: input.yearMonth });
  } catch (e) {
    console.error("deleteMonthlyRate failed", e);
    return fail({ code: "INTERNAL_ERROR", message: "月次レートの削除に失敗しました" });
  }
}
