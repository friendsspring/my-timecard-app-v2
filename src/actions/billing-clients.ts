"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { fail, ok, validationFail, type ActionResult } from "@/lib/actions/result";

const idSchema = z.string().uuid();

const billingClientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(500),
  issuerName: z.string().trim().min(1).max(120),
  taxMode: z.enum(["inclusive", "exclusive"]),
  pdfFilenameTemplate: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .default("{YYYYMM}_{CLIENT}.pdf"),
  bankInfo: z
    .string()
    .max(4000)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  note: z
    .string()
    .max(2000)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export async function listBillingClients() {
  const user = await requireUser();
  return db
    .select()
    .from(schema.billingClients)
    .where(eq(schema.billingClients.userId, user.id))
    .orderBy(asc(schema.billingClients.name));
}

export async function getBillingClient(id: string) {
  const user = await requireUser();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return null;
  const rows = await db
    .select()
    .from(schema.billingClients)
    .where(and(eq(schema.billingClients.id, parsed.data), eq(schema.billingClients.userId, user.id)))
    .limit(1);
  return rows[0] ?? null;
}

export type BillingClientInput = z.infer<typeof billingClientSchema>;

export async function createBillingClient(
  input: BillingClientInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = billingClientSchema.safeParse(input);
  if (!parsed.success) {
    return validationFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    const [row] = await db
      .insert(schema.billingClients)
      .values({
        userId: user.id,
        name: parsed.data.name,
        subject: parsed.data.subject,
        issuerName: parsed.data.issuerName,
        taxMode: parsed.data.taxMode,
        pdfFilenameTemplate: parsed.data.pdfFilenameTemplate,
        bankInfo: parsed.data.bankInfo ?? null,
        note: parsed.data.note ?? null,
      })
      .returning({ id: schema.billingClients.id });
    revalidatePath("/billing");
    revalidatePath("/projects");
    return ok({ id: row!.id });
  } catch (e) {
    console.error("createBillingClient failed", e);
    return fail({ code: "INTERNAL_ERROR", message: "請求先の作成に失敗しました" });
  }
}

export async function updateBillingClient(
  input: BillingClientInput & { id: string },
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const idCheck = idSchema.safeParse(input.id);
  if (!idCheck.success) return fail({ code: "NOT_FOUND", message: "対象が見つかりません" });
  const parsed = billingClientSchema.safeParse(input);
  if (!parsed.success) {
    return validationFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    const result = await db
      .update(schema.billingClients)
      .set({
        name: parsed.data.name,
        subject: parsed.data.subject,
        issuerName: parsed.data.issuerName,
        taxMode: parsed.data.taxMode,
        pdfFilenameTemplate: parsed.data.pdfFilenameTemplate,
        bankInfo: parsed.data.bankInfo ?? null,
        note: parsed.data.note ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.billingClients.id, idCheck.data), eq(schema.billingClients.userId, user.id)))
      .returning({ id: schema.billingClients.id });
    if (result.length === 0) {
      return fail({ code: "NOT_FOUND", message: "対象が見つかりません" });
    }
    revalidatePath("/billing");
    revalidatePath(`/billing/${idCheck.data}/invoice`);
    revalidatePath("/projects");
    return ok({ id: idCheck.data });
  } catch (e) {
    console.error("updateBillingClient failed", e);
    return fail({ code: "INTERNAL_ERROR", message: "請求先の更新に失敗しました" });
  }
}

export async function deleteBillingClient(input: { id: string }): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const idCheck = idSchema.safeParse(input.id);
  if (!idCheck.success) return fail({ code: "NOT_FOUND", message: "対象が見つかりません" });
  try {
    const result = await db
      .delete(schema.billingClients)
      .where(and(eq(schema.billingClients.id, idCheck.data), eq(schema.billingClients.userId, user.id)))
      .returning({ id: schema.billingClients.id });
    if (result.length === 0) {
      return fail({ code: "NOT_FOUND", message: "対象が見つかりません" });
    }
    revalidatePath("/billing");
    revalidatePath("/projects");
    return ok({ id: idCheck.data });
  } catch (e) {
    console.error("deleteBillingClient failed", e);
    return fail({ code: "INTERNAL_ERROR", message: "請求先の削除に失敗しました" });
  }
}
