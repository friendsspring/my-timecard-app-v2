import "server-only";

import { fromZonedTime } from "date-fns-tz";
import { and, asc, eq, gt, isNotNull, isNull, lt, or } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { JST, jstMonthRangeToUtc, jstYearMonthLastDateStr, formatJstDateWithWeekday } from "@/lib/time/jst";
import { computeMonthlySummary } from "@/lib/billing/calc";
import {
  allocateInclusiveLineTotals,
  applyInvoiceTemplate,
  computeExclusiveFromSubtotal,
  formatHoursForInvoice,
  type TaxMode,
} from "@/lib/billing/invoice";
import { formatYen } from "@/lib/format";

export type InvoiceLinePreview = {
  projectId: string;
  projectName: string;
  hours: number;
  lineBase: number;
  /** PDF 明細の小計（外税=税抜、内税=税込按分後） */
  displaySubtotal: number;
};

export type InvoicePreview = {
  billingClientId: string;
  yearMonth: string;
  taxMode: TaxMode;
  issuerName: string;
  billToName: string;
  subjectResolved: string;
  invoiceDateStr: string;
  invoiceDateDisplay: string;
  lines: InvoiceLinePreview[];
  /** 税抜ベース合計（明細 line_base の和） */
  subtotalExcl: number;
  /** 外税のみ */
  consumptionTax?: number;
  /** 税込支払額 */
  grandTotal: number;
  /** 内税のみ（うち消費税等） */
  implicitTax?: number;
  warnings: { code: "NO_PROJECTS" }[];
  bankInfo: string | null;
  pdfFilenameTemplate: string;
};

export async function loadInvoicePreview(
  userId: string,
  params: { billingClientId: string; yearMonth: string },
): Promise<InvoicePreview | null> {
  const client = await db
    .select()
    .from(schema.billingClients)
    .where(and(eq(schema.billingClients.id, params.billingClientId), eq(schema.billingClients.userId, userId)))
    .limit(1);
  const c = client[0];
  if (!c) return null;

  const { yearMonth } = params;
  const { start, end } = jstMonthRangeToUtc(yearMonth);

  const [clientProjects, allProjects, entries, rates] = await Promise.all([
    db
      .select()
      .from(schema.projects)
      .where(
        and(eq(schema.projects.userId, userId), eq(schema.projects.billingClientId, params.billingClientId)),
      )
      .orderBy(asc(schema.projects.name)),
    db.select().from(schema.projects).where(eq(schema.projects.userId, userId)),
    db
      .select()
      .from(schema.timeEntries)
      .where(
        and(
          eq(schema.timeEntries.userId, userId),
          isNull(schema.timeEntries.deletedAt),
          isNotNull(schema.timeEntries.endedAt),
          lt(schema.timeEntries.startedAt, end),
          or(isNull(schema.timeEntries.endedAt), gt(schema.timeEntries.endedAt, start))!,
        ),
      ),
    db
      .select()
      .from(schema.monthlyRates)
      .where(and(eq(schema.monthlyRates.userId, userId), eq(schema.monthlyRates.yearMonth, yearMonth))),
  ]);

  const summary = computeMonthlySummary({
    yearMonth,
    projects: allProjects.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      defaultHourlyRate: p.defaultHourlyRate,
    })),
    entries: entries.map((e) => ({
      id: e.id,
      projectId: e.projectId,
      startedAt: e.startedAt,
      endedAt: e.endedAt,
    })),
    rates: rates.map((r) => ({
      projectId: r.projectId,
      yearMonth: r.yearMonth,
      hourlyRate: r.hourlyRate,
    })),
  });

  const amountByProject = new Map(summary.perProject.map((p) => [p.projectId, p]));

  const lineBases = clientProjects.map((p) => amountByProject.get(p.id)?.amount ?? 0);
  const inclusiveAlloc =
    c.taxMode === "inclusive" ? allocateInclusiveLineTotals(lineBases) : null;

  const lines: InvoiceLinePreview[] = clientProjects.map((p, i) => {
    const s = amountByProject.get(p.id);
    const hours = s?.hours ?? 0;
    const lineBase = s?.amount ?? 0;
    const displaySubtotal =
      c.taxMode === "exclusive" ? lineBase : inclusiveAlloc!.inclusiveLines[i] ?? 0;
    return {
      projectId: p.id,
      projectName: p.name,
      hours,
      lineBase,
      displaySubtotal,
    };
  });

  const S = lineBases.reduce((a, b) => a + b, 0);
  const warnings = clientProjects.length === 0 ? [{ code: "NO_PROJECTS" as const }] : [];

  const ctx = { yearMonth, clientName: c.name };
  const subjectResolved = applyInvoiceTemplate(c.subject, ctx);
  const invoiceDateStr = jstYearMonthLastDateStr(yearMonth);
  const invoiceDateDisplay = formatJstDateWithWeekday(fromZonedTime(`${invoiceDateStr}T12:00:00`, JST));

  if (c.taxMode === "exclusive") {
    const { tax, totalIncl } = computeExclusiveFromSubtotal(S);
    return {
      billingClientId: c.id,
      yearMonth,
      taxMode: "exclusive",
      issuerName: c.issuerName,
      billToName: c.name,
      subjectResolved,
      invoiceDateStr,
      invoiceDateDisplay,
      lines,
      subtotalExcl: S,
      consumptionTax: tax,
      grandTotal: totalIncl,
      warnings,
      bankInfo: c.bankInfo,
      pdfFilenameTemplate: c.pdfFilenameTemplate,
    };
  }

  const T = inclusiveAlloc!.total;
  return {
    billingClientId: c.id,
    yearMonth,
    taxMode: "inclusive",
    issuerName: c.issuerName,
    billToName: c.name,
    subjectResolved,
    invoiceDateStr,
    invoiceDateDisplay,
    lines,
    subtotalExcl: S,
    implicitTax: T - S,
    grandTotal: T,
    warnings,
    bankInfo: c.bankInfo,
    pdfFilenameTemplate: c.pdfFilenameTemplate,
  };
}

export async function getInvoicePreview(params: {
  billingClientId: string;
  yearMonth: string;
}): Promise<InvoicePreview | null> {
  const user = await requireUser();
  return loadInvoicePreview(user.id, params);
}

export function previewToPdfProps(preview: InvoicePreview) {
  return {
    taxMode: preview.taxMode,
    issuerName: preview.issuerName,
    billToName: preview.billToName,
    subject: preview.subjectResolved,
    invoiceDate: preview.invoiceDateDisplay,
    yearMonth: preview.yearMonth,
    bankInfo: preview.bankInfo,
    lines: preview.lines.map((l) => ({
      projectName: l.projectName,
      hours: formatHoursForInvoice(l.hours),
      subtotal: formatYen(l.displaySubtotal),
    })),
    exclusive:
      preview.taxMode === "exclusive"
        ? {
            subtotal: formatYen(preview.subtotalExcl),
            tax: formatYen(preview.consumptionTax ?? 0),
            total: formatYen(preview.grandTotal),
          }
        : undefined,
    inclusive:
      preview.taxMode === "inclusive"
        ? {
            total: formatYen(preview.grandTotal),
            implicitTax: formatYen(preview.implicitTax ?? 0),
            subtotalBody: formatYen(preview.subtotalExcl),
          }
        : undefined,
  };
}
