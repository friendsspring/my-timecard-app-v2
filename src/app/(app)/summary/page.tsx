import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BarChart3 } from "lucide-react";
import { getMonthlySummary } from "@/actions/summary";
import { currentYearMonthJst, formatYearMonthJa } from "@/lib/time/jst";
import { formatYen } from "@/lib/format";
import { MonthSwitcher } from "./_month-switcher";

export const dynamic = "force-dynamic";

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ yearMonth?: string }>;
}) {
  const params = await searchParams;
  const yearMonth = params.yearMonth ?? currentYearMonthJst();
  const summary = await getMonthlySummary(yearMonth);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">月次サマリー</h1>
          <p className="text-sm text-muted-foreground">
            {formatYearMonthJa(yearMonth)} の稼働と請求額
          </p>
        </div>
        <MonthSwitcher currentYearMonth={yearMonth} />
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>合計</CardDescription>
          <CardTitle className="flex flex-wrap items-baseline gap-3 text-3xl tabular-nums">
            <span>{summary.totalHours.toFixed(1)}h</span>
            <span className="text-2xl text-primary">{formatYen(summary.totalAmount)}</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {summary.perProject.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <BarChart3 className="h-6 w-6" />
            </span>
            <p className="text-sm text-muted-foreground">この月の打刻はまだありません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {summary.perProject.map((p) => (
            <Card key={p.projectId} className="overflow-hidden">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: p.color }}
                    aria-hidden
                  />
                  <h3 className="truncate font-semibold">{p.projectName}</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">稼働時間</p>
                    <p className="text-xl font-semibold tabular-nums">{p.hours.toFixed(1)}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">請求額</p>
                    <p className="text-xl font-semibold tabular-nums text-primary">
                      {formatYen(p.amount)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    適用 <span className="tabular-nums">{formatYen(p.appliedRate)}</span>/h
                  </span>
                  <Badge variant={p.rateSource === "monthly" ? "default" : "outline"}>
                    {p.rateSource === "monthly" ? "月次" : "既定"}
                  </Badge>
                </div>
                <div>
                  <Link
                    href={{
                      pathname: "/entries",
                      query: { yearMonth, projectId: p.projectId },
                    }}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    打刻を見る
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
