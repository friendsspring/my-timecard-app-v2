"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatYearMonthJa, shiftYearMonth } from "@/lib/time/jst";

export function MonthSwitcher({ currentYearMonth }: { currentYearMonth: string }) {
  const router = useRouter();

  function go(delta: number) {
    router.push(`/summary?yearMonth=${shiftYearMonth(currentYearMonth, delta)}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-md border bg-background p-1">
      <Button size="icon" variant="ghost" onClick={() => go(-1)} aria-label="前の月">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-24 px-1 text-center text-sm font-medium tabular-nums">
        {formatYearMonthJa(currentYearMonth)}
      </span>
      <Button size="icon" variant="ghost" onClick={() => go(1)} aria-label="次の月">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
