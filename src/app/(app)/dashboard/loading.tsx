import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      </header>

      <Card>
        <CardHeader className="space-y-3 pb-2">
          <Skeleton className="h-4 w-28" />
          <div className="flex items-baseline gap-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Skeleton className="h-8 w-36" />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="space-y-3 pb-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-44" />
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-3 pb-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-44" />
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Card>
          <ul className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-4 w-12" />
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
