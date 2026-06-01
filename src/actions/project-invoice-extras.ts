"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { fail, ok, validationFail, type ActionResult } from "@/lib/actions/result";

const yearMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

const createSchema = z.object({
  projectId: z.string().uuid(),
  yearMonth: z.string().regex(yearMonthRegex, "年月の形式が不正です"),
  label: z.string().trim().min(1, "項目名を入力してください").max(120, "120文字以内で入力してください"),
  amount: z.coerce
    .number({ invalid_type_error: "整数を入力してください" })
    .int("整数で入力してください")
    .min(0, "0以上で入力してください")
    .max(100_000_000, "100,000,000以下で入力してください"),
});

const idSchema = z.string().uuid();

async function assertProjectOwned(userId: string, projectId: string) {
  const rows = await db
    .select({
      id: schema.projects.id,
      billingClientId: schema.projects.billingClientId,
    })
    .from(schema.projects)
    .where(and(eq(schema.projects.id, projectId), eq(schema.projects.userId, userId)))
    .limit(1);
  if (rows.length === 0) {
    throw new Error("NOT_FOUND");
  }
  return rows[0]!;
}

function revalidateInvoicePaths(project: { id: string; billingClientId: string | null }) {
  revalidatePath(`/projects/${project.id}`);
  revalidatePath("/billing");
  if (project.billingClientId) {
    revalidatePath(`/billing/${project.billingClientId}/invoice`);
  }
}

export async function listProjectInvoiceExtras(projectId: string) {
  const user = await requireUser();
  return db
    .select()
    .from(schema.projectInvoiceExtras)
    .where(
      and(
        eq(schema.projectInvoiceExtras.userId, user.id),
        eq(schema.projectInvoiceExtras.projectId, projectId),
      ),
    )
    .orderBy(
      asc(schema.projectInvoiceExtras.yearMonth),
      asc(schema.projectInvoiceExtras.sortOrder),
      asc(schema.projectInvoiceExtras.createdAt),
    );
}

export async function createProjectInvoiceExtra(input: {
  projectId: string;
  yearMonth: string;
  label: string;
  amount: number | string;
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return validationFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  let project;
  try {
    project = await assertProjectOwned(user.id, parsed.data.projectId);
  } catch {
    return fail({ code: "NOT_FOUND", message: "プロジェクトが見つかりません" });
  }

  try {
    const [row] = await db
      .insert(schema.projectInvoiceExtras)
      .values({
        userId: user.id,
        projectId: parsed.data.projectId,
        yearMonth: parsed.data.yearMonth,
        label: parsed.data.label,
        amount: parsed.data.amount,
      })
      .returning({ id: schema.projectInvoiceExtras.id });
    revalidateInvoicePaths(project);
    return ok({ id: row!.id });
  } catch (e) {
    console.error("createProjectInvoiceExtra failed", e);
    return fail({ code: "INTERNAL_ERROR", message: "請求明細の追加に失敗しました" });
  }
}

export async function deleteProjectInvoiceExtra(input: {
  id: string;
  projectId: string;
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const idCheck = idSchema.safeParse(input.id);
  if (!idCheck.success) {
    return fail({ code: "NOT_FOUND", message: "対象が見つかりません" });
  }

  try {
    const result = await db
      .delete(schema.projectInvoiceExtras)
      .where(
        and(
          eq(schema.projectInvoiceExtras.id, idCheck.data),
          eq(schema.projectInvoiceExtras.userId, user.id),
          eq(schema.projectInvoiceExtras.projectId, input.projectId),
        ),
      )
      .returning({ id: schema.projectInvoiceExtras.id });

    if (result.length === 0) {
      return fail({ code: "NOT_FOUND", message: "対象が見つかりません" });
    }
    const project = await assertProjectOwned(user.id, input.projectId);
    revalidateInvoicePaths(project);
    return ok({ id: idCheck.data });
  } catch (e) {
    console.error("deleteProjectInvoiceExtra failed", e);
    return fail({ code: "INTERNAL_ERROR", message: "請求明細の削除に失敗しました" });
  }
}
