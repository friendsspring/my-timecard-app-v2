import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getProject } from "@/actions/projects";
import { listMonthlyRates } from "@/actions/rates";
import { listEntries } from "@/actions/entries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectFormDialog } from "../_form-dialog";
import { ProjectMenu } from "../_project-menu";
import { MonthlyRateSection } from "./_monthly-rate-section";
import {
  currentYearMonthJst,
  formatJstDateWithWeekday,
  toJstTimeString,
} from "@/lib/time/jst";
import { formatDurationJa, formatYen } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [rates, recentEntries] = await Promise.all([
    listMonthlyRates(project.id),
    listEntries({ projectId: project.id, limit: 20 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
            プロジェクト一覧
          </Link>
        </Button>
      </div>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="h-5 w-5 rounded-full"
            style={{ backgroundColor: project.color }}
            aria-hidden
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-sm text-muted-foreground">
              既定 <span className="tabular-nums">{formatYen(project.defaultHourlyRate)}</span>/h
              {project.archivedAt ? (
                <Badge variant="secondary" className="ml-2">
                  アーカイブ
                </Badge>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ProjectFormDialog mode="edit" project={project} />
          <ProjectMenu project={project} />
        </div>
      </header>

      {project.note ? (
        <Card>
          <CardContent className="p-4 text-sm whitespace-pre-wrap text-muted-foreground">
            {project.note}
          </CardContent>
        </Card>
      ) : null}

      <MonthlyRateSection
        projectId={project.id}
        currentYearMonth={currentYearMonthJst()}
        rates={rates.map((r) => ({ yearMonth: r.yearMonth, hourlyRate: r.hourlyRate }))}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">直近の打刻</h2>
        {recentEntries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              このプロジェクトの打刻はありません
            </CardContent>
          </Card>
        ) : (
          <Card>
            <ul className="divide-y">
              {recentEntries.map((e) => {
                const durationMs = e.endedAt
                  ? e.endedAt.getTime() - e.startedAt.getTime()
                  : null;
                return (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatJstDateWithWeekday(e.startedAt)} {toJstTimeString(e.startedAt)}
                        {e.endedAt ? ` - ${toJstTimeString(e.endedAt)}` : ""}
                      </p>
                      {e.memo ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{e.memo}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {durationMs !== null ? formatDurationJa(durationMs) : "進行中"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
