import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getBillingClient } from "@/actions/billing-clients";
import { getInvoicePreview } from "@/actions/invoice";
import { currentYearMonthJst } from "@/lib/time/jst";
import { formatYen } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceMonthSwitcher } from "./_invoice-month-switcher";
import { InvoiceDownloadButton } from "./_invoice-download-button";

export const dynamic = "force-dynamic";

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ yearMonth?: string }>;
}) {
  const { clientId } = await params;
  const sp = await searchParams;
  const client = await getBillingClient(clientId);
  if (!client) notFound();

  const yearMonth = sp.yearMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.yearMonth) ? sp.yearMonth : currentYearMonthJst();
  const preview = await getInvoicePreview({ billingClientId: clientId, yearMonth });
  if (!preview) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/billing">
            <ArrowLeft className="h-4 w-4" />
            請求先一覧
          </Link>
        </Button>
      </div>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">請求書 PDF</h1>
          <p className="text-sm text-muted-foreground">{client.name}</p>
        </div>
        <InvoiceMonthSwitcher billingClientId={clientId} currentYearMonth={yearMonth} />
      </header>

      {preview.warnings.some((w) => w.code === "NO_PROJECTS") ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          この請求先に紐づくプロジェクトがありません。PDF は空の明細で出力されます。
        </div>
      ) : null}
      {preview.warnings.some((w) => w.code === "ALL_ZERO_HOURS") ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          紐づくプロジェクトはありますが、対象月の稼働がすべて 0 時間のため、明細は空です。PDF も同様です。
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">プレビュー</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">件名</p>
              <p className="font-medium">{preview.subjectResolved}</p>
            </div>
            <div>
              <p className="text-muted-foreground">請求日</p>
              <p className="font-medium">{preview.invoiceDateDisplay}</p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-muted-foreground">明細</p>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 font-medium">プロジェクト</th>
                    <th className="px-3 py-2 font-medium text-right">稼働</th>
                    <th className="px-3 py-2 font-medium text-right">小計</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.lines.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                        明細なし
                      </td>
                    </tr>
                  ) : (
                    preview.lines.map((l) => (
                      <tr key={l.projectId} className="border-t">
                        <td className="px-3 py-2">{l.projectName}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.hours.toFixed(2)} h</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatYen(l.displaySubtotal)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex flex-col gap-1 border-t pt-4 sm:items-end">
            {preview.taxMode === "exclusive" ? (
              <>
                <p className="tabular-nums text-muted-foreground">税抜合計 {formatYen(preview.subtotalExcl)}</p>
                <p className="tabular-nums text-muted-foreground">
                  消費税（10%） {formatYen(preview.consumptionTax ?? 0)}
                </p>
                <p className="text-lg font-semibold tabular-nums">税込合計 {formatYen(preview.grandTotal)}</p>
              </>
            ) : (
              <>
                <p className="tabular-nums text-muted-foreground">税抜相当 {formatYen(preview.subtotalExcl)}</p>
                <p className="text-lg font-semibold tabular-nums">合計（税込） {formatYen(preview.grandTotal)}</p>
                <p className="tabular-nums text-muted-foreground">（うち消費税等 {formatYen(preview.implicitTax ?? 0)}）</p>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <InvoiceDownloadButton billingClientId={clientId} yearMonth={yearMonth} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
