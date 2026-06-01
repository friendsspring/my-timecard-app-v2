import type { TaxMode } from "@/lib/db/schema";
import { allocateInclusiveLineTotals } from "@/lib/billing/invoice";

export type InvoiceLineKind = "hourly" | "extra";

export type InvoiceLineInput = {
  kind: InvoiceLineKind;
  projectId: string;
  projectName: string;
  label?: string;
  hours: number | null;
  lineBase: number;
};

export type InvoiceLineBuilt = InvoiceLineInput & {
  displaySubtotal: number;
};

export function buildInvoiceLines(
  rows: InvoiceLineInput[],
  taxMode: TaxMode,
): InvoiceLineBuilt[] {
  const lineBases = rows.map((r) => r.lineBase);
  const inclusiveAlloc =
    taxMode === "inclusive" ? allocateInclusiveLineTotals(lineBases) : null;

  return rows.map((r, i) => ({
    ...r,
    displaySubtotal:
      taxMode === "exclusive" ? r.lineBase : inclusiveAlloc!.inclusiveLines[i] ?? 0,
  }));
}

export function invoiceLineDescription(line: Pick<InvoiceLineBuilt, "kind" | "projectName" | "label">): string {
  if (line.kind === "hourly") return line.projectName;
  return `${line.projectName} — ${line.label ?? ""}`;
}
