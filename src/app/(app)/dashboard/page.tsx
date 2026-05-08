import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Clock3 } from "lucide-react";

import { listProjects } from "@/actions/projects";
import { getOpenEntry, listRecentEntries } from "@/actions/entries";
import { getMonthlySummary } from "@/actions/summary";
import {
  currentYearMonthJst,
  formatJstDateWithWeekday,
  formatYearMonthJa,
  toJstTimeString,
} from "@/lib/time/jst";
import { formatDurationJa, formatYen } from "@/lib/format";

import { ActiveTimer } from "./_active-timer";
import { StartEntryForm } from "./_start-form";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const yearMonth = currentYearMonthJst();
  const [projects, openEntry, recent, summary] = await Promise.all([
    listProjects({ includeArchived: false }),
    getOpenEntry(),
    listRecentEntries(10),
    getMonthlySummary(yearMonth),
  ]);

  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const openProject = openEntry ? projectMap.get(openEntry.projectId) : null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
          <p className="text-sm text-muted-foreground">{formatYearMonthJa(yearMonth)} の稼働</p>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>今月のサマリー</CardDescription>
          <CardTitle className="flex items-baseline gap-3 text-3xl">
            <span className="tabular-nums">{summary.totalHours.toFixed(1)}h</span>
            <span className="text-base font-semibold text-muted-foreground tabular-nums">
              {formatYen(summary.totalAmount)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Button asChild variant="ghost" size="sm">
            <Link href="/summary">
              月次サマリーを見る
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {openEntry && openProject ? (
          <ActiveTimer
            entry={{
              id: openEntry.id,
              startedAt: openEntry.startedAt.toISOString(),
              memo: openEntry.memo,
            }}
            project={{ name: openProject.name, color: openProject.color }}
          />
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>進行中の打刻</CardDescription>
              <CardTitle className="text-base font-medium text-muted-foreground">
                進行中の打刻はありません
              </CardTitle>
            </CardHeader>
          </Card>
        )}

        <StartEntryForm projects={projects} disabled={!!openEntry} />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">直近の打刻</h2>
        {recent.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <Clock3 className="h-5 w-5" />
              まだ打刻がありません
            </CardContent>
          </Card>
        ) : (
          <Card>
            <ul className="divide-y">
              {recent.map((e) => {
                const durationMs = e.endedAt
                  ? e.endedAt.getTime() - e.startedAt.getTime()
                  : null;
                return (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: e.project.color }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{e.project.name}</span>
                        {!e.endedAt ? (
                          <Badge variant="secondary" className="shrink-0">
                            進行中
                          </Badge>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatJstDateWithWeekday(e.startedAt)} {toJstTimeString(e.startedAt)}
                        {e.endedAt ? ` - ${toJstTimeString(e.endedAt)}` : ""}
                        {e.memo ? ` ・ ${e.memo}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {durationMs !== null ? formatDurationJa(durationMs) : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
        <div className="flex justify-end">
          <Button asChild variant="ghost" size="sm">
            <Link href="/entries">
              すべての打刻を見る
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
