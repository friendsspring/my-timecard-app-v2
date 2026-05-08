"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Project } from "@/lib/db/schema";
import { formatYearMonthJa, shiftYearMonth } from "@/lib/time/jst";

type Props = {
  projects: Project[];
  currentYearMonth: string;
  currentProjectId: string;
};

export function EntriesToolbar({ projects, currentYearMonth, currentProjectId }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  function navigateWith(updates: { yearMonth?: string; projectId?: string }) {
    const next = new URLSearchParams(params);
    if (updates.yearMonth !== undefined) next.set("yearMonth", updates.yearMonth);
    if (updates.projectId !== undefined) {
      if (updates.projectId === "all") next.delete("projectId");
      else next.set("projectId", updates.projectId);
    }
    router.push(`/entries?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-md border bg-background p-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => navigateWith({ yearMonth: shiftYearMonth(currentYearMonth, -1) })}
          aria-label="前の月"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-24 px-1 text-center text-sm font-medium tabular-nums">
          {formatYearMonthJa(currentYearMonth)}
        </span>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => navigateWith({ yearMonth: shiftYearMonth(currentYearMonth, 1) })}
          aria-label="次の月"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Select
        value={currentProjectId}
        onValueChange={(value) => navigateWith({ projectId: value })}
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder="プロジェクトを選択" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべてのプロジェクト</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: p.color }}
                  aria-hidden
                />
                {p.name}
                {p.archivedAt ? "（アーカイブ）" : ""}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
