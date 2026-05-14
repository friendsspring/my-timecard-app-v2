"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatYearMonthJa, shiftYearMonth } from "@/lib/time/jst";

export function InvoiceMonthSwitcher({
  billingClientId,
  currentYearMonth,
}: {
  billingClientId: string;
  currentYearMonth: string;
}) {
  const prev = shiftYearMonth(currentYearMonth, -1);
  const next = shiftYearMonth(currentYearMonth, 1);

  return (
    <div className="flex items-center gap-1 rounded-md border bg-background p-1">
      <Button size="icon" variant="ghost" asChild aria-label="前の月">
        <Link href={`/billing/${billingClientId}/invoice?yearMonth=${prev}`}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </Button>
      <span className="min-w-24 px-1 text-center text-sm font-medium tabular-nums">
        {formatYearMonthJa(currentYearMonth)}
      </span>
      <Button size="icon" variant="ghost" asChild aria-label="次の月">
        <Link href={`/billing/${billingClientId}/invoice?yearMonth=${next}`}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
