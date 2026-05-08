import { listEntries } from "@/actions/entries";
import { listProjects } from "@/actions/projects";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListChecks } from "lucide-react";
import { currentYearMonthJst, formatJstDateWithWeekday, formatYearMonthJa, toJstTimeString } from "@/lib/time/jst";
import { formatDurationJa } from "@/lib/format";
import { EntriesToolbar } from "./_toolbar";
import { EntryActions } from "./_entry-actions";
import { ManualEntryDialog } from "./_manual-entry-dialog";

export const dynamic = "force-dynamic";

export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ yearMonth?: string; projectId?: string }>;
}) {
  const params = await searchParams;
  const yearMonth = params.yearMonth ?? currentYearMonthJst();
  const projectId = params.projectId === "all" ? undefined : params.projectId;

  const [projects, entries] = await Promise.all([
    listProjects({ includeArchived: true }),
    listEntries({ yearMonth, projectId, limit: 200 }),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">打刻</h1>
          <p className="text-sm text-muted-foreground">
            {formatYearMonthJa(yearMonth)} の打刻一覧（{entries.length} 件）
          </p>
        </div>
        <ManualEntryDialog projects={projects.filter((p) => !p.archivedAt)} />
      </header>

      <EntriesToolbar
        projects={projects}
        currentYearMonth={yearMonth}
        currentProjectId={params.projectId ?? "all"}
      />

      {entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <ListChecks className="h-6 w-6" />
            </span>
            <p className="text-sm text-muted-foreground">この条件に一致する打刻はありません</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y">
            {entries.map((e) => {
              const durationMs = e.endedAt
                ? e.endedAt.getTime() - e.startedAt.getTime()
                : null;
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: e.project.color }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{e.project.name}</span>
                        {!e.endedAt ? (
                          <Badge variant="secondary" className="shrink-0">
                            進行中
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatJstDateWithWeekday(e.startedAt)}{" "}
                        {toJstTimeString(e.startedAt)}
                        {e.endedAt ? ` - ${toJstTimeString(e.endedAt)}` : ""}
                      </p>
                      {e.memo ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{e.memo}</p>
                      ) : null}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {durationMs !== null ? formatDurationJa(durationMs) : "—"}
                  </span>
                  <EntryActions
                    entry={{
                      id: e.id,
                      projectId: e.projectId,
                      startedAt: e.startedAt.toISOString(),
                      endedAt: e.endedAt ? e.endedAt.toISOString() : null,
                      memo: e.memo,
                    }}
                    projects={projects}
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
