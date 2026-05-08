import Link from "next/link";
import { Clock3, LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth/guard";
import { Button } from "@/components/ui/button";
import { AppNav } from "./_nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const links = [
    { href: "/dashboard", label: "ダッシュボード", iconKey: "dashboard" },
    { href: "/projects", label: "プロジェクト", iconKey: "projects" },
    { href: "/entries", label: "打刻", iconKey: "entries" },
    { href: "/summary", label: "月次サマリー", iconKey: "summary" },
  ] as const;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-14 items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Clock3 className="h-4 w-4" />
            </span>
            <span>My Timecard</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
            <form action="/api/auth/signout" method="post">
              <Button type="submit" variant="ghost" size="sm" title="ログアウト">
                <LogOut className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-1">ログアウト</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="container flex flex-col gap-6 py-6 md:flex-row">
        <aside className="hidden md:block md:w-56 md:shrink-0">
          <AppNav links={links} />
        </aside>

        <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background md:hidden">
        <AppNav links={links} variant="bottom" />
      </nav>
    </div>
  );
}
