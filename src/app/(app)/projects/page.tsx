import { listProjects } from "@/actions/projects";
import { listBillingClients } from "@/actions/billing-clients";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectFormDialog } from "./_form-dialog";
import { ProjectMenu } from "./_project-menu";
import { formatYen } from "@/lib/format";
import { FolderKanban } from "lucide-react";

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
            <Card key={p.id} className="overflow-hidden">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: p.color }}
                      aria-hidden
                    />
                    <h2 className="truncate font-semibold">{p.name}</h2>
                  </div>
          <ProjectMenu project={p} billingClients={billingOptions} />
                </div>
                <div className="text-sm text-muted-foreground">
                  既定 <span className="tabular-nums text-foreground">{formatYen(p.defaultHourlyRate)}</span>
                  /h
                </div>
                {p.note ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{p.note}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {archived.length > 0 ? (
        <section className="space-y-3 pt-2">
          <h2 className="text-sm font-medium text-muted-foreground">アーカイブ済み（{archived.length}）</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {archived.map((p) => (
              <Card key={p.id} className="overflow-hidden bg-muted/30">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full opacity-50"
                        style={{ backgroundColor: p.color }}
                        aria-hidden
                      />
                      <h3 className="truncate text-muted-foreground">{p.name}</h3>
                      <Badge variant="secondary" className="ml-1">
                        アーカイブ
                      </Badge>
                    </div>
            <ProjectMenu project={p} billingClients={billingOptions} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
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
