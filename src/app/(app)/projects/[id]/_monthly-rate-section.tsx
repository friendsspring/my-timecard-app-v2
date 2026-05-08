"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteMonthlyRate, upsertMonthlyRate } from "@/actions/rates";
import { formatYearMonthJa } from "@/lib/time/jst";
import { formatYen } from "@/lib/format";

type Rate = { yearMonth: string; hourlyRate: number };

type Props = {
  projectId: string;
  currentYearMonth: string;
  rates: Rate[];
};

export function MonthlyRateSection({ projectId, currentYearMonth, rates }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [yearMonth, setYearMonth] = useState(currentYearMonth);
  const [rate, setRate] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) {
      setErrors({ yearMonth: ["年月の形式が不正です（YYYY-MM）"] });
      return;
    }
    if (!rate.trim()) {
      setErrors({ hourlyRate: ["時給を入力してください"] });
      return;
    }
    startTransition(async () => {
      const result = await upsertMonthlyRate({
        projectId,
        yearMonth,
        hourlyRate: rate,
      });
      if (!result.ok) {
        if (result.error.code === "VALIDATION_ERROR" && result.error.fieldErrors) {
          setErrors(result.error.fieldErrors);
        }
        toast.error(result.error.message);
        return;
      }
      toast.success("月次レートを保存しました");
      setRate("");
      router.refresh();
    });
  }

  function handleDelete(yearMonth: string) {
    if (!window.confirm(`${formatYearMonthJa(yearMonth)} の月次レートを解除しますか？`)) return;
    startTransition(async () => {
      const result = await deleteMonthlyRate({ projectId, yearMonth });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("月次レートを解除しました");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>月次レート</CardDescription>
        <CardTitle className="text-base">月単位で時給を上書き</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
          <div className="space-y-1">
            <Label htmlFor="rate-month">年月（YYYY-MM）</Label>
            <Input
              id="rate-month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              placeholder="2026-05"
              required
            />
            {errors.yearMonth?.map((m) => (
              <p key={m} className="text-xs text-destructive">
                {m}
              </p>
            ))}
          </div>
          <div className="space-y-1">
            <Label htmlFor="rate-amount">時給（JPY/h）</Label>
            <Input
              id="rate-amount"
              inputMode="numeric"
              pattern="[0-9]*"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="5500"
              required
            />
            {errors.hourlyRate?.map((m) => (
              <p key={m} className="text-xs text-destructive">
                {m}
              </p>
            ))}
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? "保存中..." : "保存 / 上書き"}
            </Button>
          </div>
        </form>

        {rates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            設定された月次レートはありません。未設定の月は既定時給が適用されます。
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {rates.map((r) => (
              <li
                key={r.yearMonth}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <span className="text-sm tabular-nums">{formatYearMonthJa(r.yearMonth)}</span>
                <span className="text-sm font-medium tabular-nums">
                  {formatYen(r.hourlyRate)}/h
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(r.yearMonth)}
                  disabled={pending}
                  aria-label="削除"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
