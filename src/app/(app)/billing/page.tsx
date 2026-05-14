import Link from "next/link";
import { FileDown } from "lucide-react";

import { listBillingClients } from "@/actions/billing-clients";
import { BillingClientFormDialog } from "./_billing-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BillingDeleteButton } from "./_billing-delete-button";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const clients = await listBillingClients();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">請求先</h1>
          <p className="text-sm text-muted-foreground">
            請求書 PDF の宛先を管理します。プロジェクトごとに 1 つの請求先へ紐付けます。
          </p>
        </div>
        <BillingClientFormDialog mode="create" />
      </header>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            請求先がありません。右上から追加してください。
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {clients.map((c) => (
            <li key={c.id}>
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="font-semibold">{c.name}</h2>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.subject}</p>
                    </div>
                    <Badge variant={c.taxMode === "exclusive" ? "secondary" : "outline"}>
                      {c.taxMode === "exclusive" ? "外税" : "内税"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="default">
                      <Link href={`/billing/${c.id}/invoice`}>
                        <FileDown className="h-4 w-4" />
                        請求書 PDF
                      </Link>
                    </Button>
                    <BillingClientFormDialog mode="edit" client={c} />
                    <BillingDeleteButton id={c.id} name={c.name} />
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
