import Link from "next/link";
import { ChevronRight, FolderKanban } from "lucide-react";

import { listProjects } from "@/actions/projects";
import { listBillingClients } from "@/actions/billing-clients";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectFormDialog } from "./_form-dialog";
import { ProjectMenu } from "./_project-menu";
import { formatYen } from "@/lib/format";
import type { Project } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await listProjects({ includeArchived: true });
  const billingClients = await listBillingClients();
  const billingOptions = billingClients.map((b) => ({ id: b.id, name: b.name }));

  const active = projects.filter((p) => !p.archivedAt);
  const archived = projects.filter((p) => p.archivedAt);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">プロジェクト</h1>
          <p className="text-sm text-muted-foreground">
            稼働を記録する案件を管理します（{active.length} 件）
          </p>
        </div>
        <ProjectFormDialog mode="create" billingClients={billingOptions} />
      </header>

      {active.length === 0 ? (
        <EmptyState billingClients={billingOptions} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {active.map((p) => (
            <ProjectListCard key={p.id} project={p} billingClients={billingOptions} />
          ))}
        </div>
      )}

      {archived.length > 0 ? (
        <section className="space-y-3 pt-2">
          <h2 className="text-sm font-medium text-muted-foreground">アーカイブ済み（{archived.length}）</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {archived.map((p) => (
              <ProjectListCard
                key={p.id}
                project={p}
                billingClients={billingOptions}
                archived
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ProjectListCard({
  project,
  billingClients,
  archived = false,
}: {
  project: Project;
  billingClients: { id: string; name: string }[];
  archived?: boolean;
}) {
  const href = `/projects/${project.id}`;

  return (
    <Card className={archived ? "overflow-hidden bg-muted/30" : "overflow-hidden"}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={href} className="group min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`h-3 w-3 shrink-0 rounded-full ${archived ? "opacity-50" : ""}`}
                style={{ backgroundColor: project.color }}
                aria-hidden
              />
              <h2
                className={`truncate font-semibold group-hover:underline ${archived ? "text-muted-foreground" : ""}`}
              >
                {project.name}
              </h2>
              {archived ? (
                <Badge variant="secondary" className="ml-1 shrink-0">
                  アーカイブ
                </Badge>
              ) : null}
            </div>
          </Link>
          <ProjectMenu project={project} billingClients={billingClients} />
        </div>
        {!archived ? (
          <div className="text-sm text-muted-foreground">
            既定{" "}
            <span className="tabular-nums text-foreground">{formatYen(project.defaultHourlyRate)}</span>
            /h
          </div>
        ) : null}
        {!archived && project.note ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">{project.note}</p>
        ) : null}
        <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
          <Link href={href}>
            詳細（月次レート・請求明細）
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState({ billingClients }: { billingClients: { id: string; name: string }[] }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FolderKanban className="h-6 w-6" />
        </span>
        <div className="space-y-1">
          <p className="font-semibold">最初のプロジェクトを作りましょう</p>
          <p className="text-sm text-muted-foreground">
            プロジェクトを作成すると、ダッシュボードから打刻を開始できます。
          </p>
        </div>
        <ProjectFormDialog mode="create" billingClients={billingClients} />
      </CardContent>
    </Card>
  );
}
