"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Clock3, FileText, FolderKanban, ListChecks, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  dashboard: Clock3,
  projects: FolderKanban,
  entries: ListChecks,
  summary: BarChart3,
  billing: FileText,
};

type NavLink = {
  href: string;
  label: string;
  iconKey: keyof typeof ICONS;
};

export function AppNav({
  links,
  variant = "side",
}: {
  links: readonly NavLink[];
  variant?: "side" | "bottom";
}) {
  const pathname = usePathname();

  if (variant === "bottom") {
    return (
      <ul className="flex">
        {links.map(({ href, label, iconKey }) => {
          const Icon = ICONS[iconKey];
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {Icon ? <Icon className="h-5 w-5" /> : null}
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {links.map(({ href, label, iconKey }) => {
        const Icon = ICONS[iconKey];
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {Icon ? <Icon className="h-4 w-4" /> : null}
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
