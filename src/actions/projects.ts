"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { fail, ok, validationFail, type ActionResult } from "@/lib/actions/result";

const projectSchema = z.object({
  name: z.string().trim().min(1, "プロジェクト名を入力してください").max(80, "80文字以内で入力してください"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "色は #RRGGBB 形式で指定してください"),
  defaultHourlyRate: z
    .coerce.number({ invalid_type_error: "整数を入力してください" })
    .int("整数で入力してください")
    .min(0, "0以上で入力してください")
    .max(1_000_000, "1,000,000以下で入力してください"),
  note: z
    .string()
    .max(2000, "メモは2000文字以内で入力してください")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  billingClientId: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .optional()
    .transform((v) => {
      if (v === "" || v === undefined || v === null) return null;
      return v;
    }),
});

const idSchema = z.string().uuid();

export async function listProjects(options?: { includeArchived?: boolean }) {
  const user = await requireUser();
  const includeArchived = options?.includeArchived ?? false;

  const where = includeArchived
    ? eq(schema.projects.userId, user.id)
    : and(eq(schema.projects.userId, user.id), isNull(schema.projects.archivedAt));

  return db
    .select()
    .from(schema.projects)
    .where(where)
    .orderBy(asc(schema.projects.archivedAt), asc(schema.projects.name));
}

export async function getProject(id: string) {
  const user = await requireUser();
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return null;
  const rows = await db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, parsedId.data), eq(schema.projects.userId, user.id)))
    .limit(1);
  return rows[0] ?? null;
}

export type CreateProjectInput = {
  name: string;
  color: string;
  defaultHourlyRate: number | string;
  note?: string | undefined;
  billingClientId?: string | null;
};

async function assertBillingClientOwned(userId: string, billingClientId: string | null) {
  if (billingClientId === null) return;
  const rows = await db
    .select({ id: schema.billingClients.id })
    .from(schema.billingClients)
    .where(and(eq(schema.billingClients.id, billingClientId), eq(schema.billingClients.userId, userId)))
    .limit(1);
  if (rows.length === 0) {
    throw new Error("BILLING_CLIENT_INVALID");
  }
}

export async function createProject(input: CreateProjectInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return validationFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  try {
    await assertBillingClientOwned(user.id, parsed.data.billingClientId ?? null);
  } catch {
    return fail({ code: "VALIDATION_ERROR", message: "請求先の指定が不正です" });
  }

  try {
    const [row] = await db
      .insert(schema.projects)
      .values({
        userId: user.id,
        name: parsed.data.name,
        color: parsed.data.color,
        defaultHourlyRate: parsed.data.defaultHourlyRate,
        note: parsed.data.note,
        billingClientId: parsed.data.billingClientId ?? null,
      })
      .returning({ id: schema.projects.id });
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    revalidatePath("/billing");
    return ok({ id: row!.id });
  } catch (e) {
    console.error("createProject failed", e);
    return fail({ code: "INTERNAL_ERROR", message: "プロジェクトの作成に失敗しました" });
  }
}

export async function updateProject(
  input: CreateProjectInput & { id: string },
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const idCheck = idSchema.safeParse(input.id);
  if (!idCheck.success) return fail({ code: "NOT_FOUND", message: "対象が見つかりません" });
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return validationFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const billingId = parsed.data.billingClientId ?? null;
  if (billingId !== null) {
    try {
      await assertBillingClientOwned(user.id, billingId);
    } catch {
      return fail({ code: "VALIDATION_ERROR", message: "請求先の指定が不正です" });
    }
  }

  try {
    const result = await db
      .update(schema.projects)
      .set({
        name: parsed.data.name,
        color: parsed.data.color,
        defaultHourlyRate: parsed.data.defaultHourlyRate,
        note: parsed.data.note ?? null,
        billingClientId: billingId,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.projects.id, idCheck.data), eq(schema.projects.userId, user.id)))
      .returning({ id: schema.projects.id });

    if (result.length === 0) {
      return fail({ code: "NOT_FOUND", message: "対象が見つかりません" });
    }
    revalidatePath("/projects");
    revalidatePath(`/projects/${idCheck.data}`);
    revalidatePath("/dashboard");
    revalidatePath("/billing");
    return ok({ id: idCheck.data });
  } catch (e) {
    console.error("updateProject failed", e);
    return fail({ code: "INTERNAL_ERROR", message: "プロジェクトの更新に失敗しました" });
  }
}

export async function setProjectArchived(input: {
  id: string;
  archived: boolean;
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const idCheck = idSchema.safeParse(input.id);
  if (!idCheck.success) return fail({ code: "NOT_FOUND", message: "対象が見つかりません" });

  try {
    const result = await db
      .update(schema.projects)
      .set({ archivedAt: input.archived ? new Date() : null, updatedAt: new Date() })
      .where(and(eq(schema.projects.id, idCheck.data), eq(schema.projects.userId, user.id)))
      .returning({ id: schema.projects.id });

    if (result.length === 0) {
      return fail({ code: "NOT_FOUND", message: "対象が見つかりません" });
    }
    revalidatePath("/projects");
    revalidatePath(`/projects/${idCheck.data}`);
    revalidatePath("/dashboard");
    revalidatePath("/billing");
    return ok({ id: idCheck.data });
  } catch (e) {
    console.error("setProjectArchived failed", e);
    return fail({ code: "INTERNAL_ERROR", message: "更新に失敗しました" });
  }
}
