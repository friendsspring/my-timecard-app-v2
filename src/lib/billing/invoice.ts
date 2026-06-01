import type { TaxMode } from "@/lib/db/schema";

export type { TaxMode };

export function roundHalfUpInt(n: number): number {
  return Math.round(n);
}

/** 外税: 税抜合計 S、消費税、税込合計 */
export function computeExclusiveFromSubtotal(S: number): { subtotalExcl: number; tax: number; totalIncl: number } {
  const tax = roundHalfUpInt(S * 0.1);
  return { subtotalExcl: S, tax, totalIncl: S + tax };
}

/**
 * 内税: 明細はすでに税込金額として扱い、合計は lineBases の和をそのまま使う。
 */
export function allocateInclusiveLineTotals(lineBases: readonly number[]): { inclusiveLines: number[]; total: number; S: number } {
  const S = lineBases.reduce((a, b) => a + b, 0);
  if (lineBases.length === 0) {
    return { inclusiveLines: [], total: 0, S: 0 };
  }
  if (S === 0) {
    return { inclusiveLines: lineBases.map(() => 0), total: 0, S: 0 };
  }
  return { inclusiveLines: [...lineBases], total: S, S };
}

/**
 * 内税: 税込合計を固定し、税抜相当と税額を内訳表示用に逆算する。
 */
export function computeInclusiveFromTotal(totalIncl: number): {
  subtotalExcl: number;
  implicitTax: number;
  totalIncl: number;
} {
  const subtotalExcl = roundHalfUpInt(totalIncl / 1.1);
  const implicitTax = totalIncl - subtotalExcl;
  return { subtotalExcl, implicitTax, totalIncl };
}

export type TemplateContext = {
  yearMonth: string;
  clientName: string;
};

/** 件名・ファイル名用。`{YYYYMM}` `{YYYY-MM}` `{YYYY}` `{MM}` `{CLIENT}` */
export function applyInvoiceTemplate(template: string, ctx: TemplateContext): string {
  const [yStr, mStr] = ctx.yearMonth.split("-");
  const y = yStr ?? "";
  const m = (mStr ?? "").padStart(2, "0");
  const yyyyMm = `${y}${m}`;
  return template
    .replaceAll("{YYYYMM}", yyyyMm)
    .replaceAll("{YYYY-MM}", ctx.yearMonth)
    .replaceAll("{YYYY}", y)
    .replaceAll("{MM}", m)
    .replaceAll("{CLIENT}", sanitizeFilenamePart(ctx.clientName));
}

export function sanitizeFilenamePart(name: string): string {
  const s = name
    .trim()
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  return s || "client";
}

/** 拡張子 .pdf を付与（無ければ）し、パス成分を除去 */
export function resolvePdfFilename(templateResolved: string): string {
  let base = templateResolved.trim().replace(/^.*[/\\]/, "");
  if (!base.toLowerCase().endsWith(".pdf")) {
    base = `${base}.pdf`;
  }
  return base || "invoice.pdf";
}

export function formatHoursForInvoice(hours: number): string {
  return `${hours.toFixed(2)} 時間`;
}
