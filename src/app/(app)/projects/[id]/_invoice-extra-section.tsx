"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createProjectInvoiceExtra,
  deleteProjectInvoiceExtra,
} from "@/actions/project-invoice-extras";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatYearMonthJa } from "@/lib/time/jst";
import { formatYen } from "@/lib/format";

type Extra = {
  id: string;
  yearMonth: string;
  label: string;
  amount: number;
};

type Props = {
  projectId: string;
  currentYearMonth: string;
  extras: Extra[];
};

export function InvoiceExtraSection({ projectId, currentYearMonth, extras }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [yearMonth, setYearMonth] = useState(currentYearMonth);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) {
      setErrors({ yearMonth: ["年月の形式が不正です（YYYY-MM）"] });
      return;
    }
    if (!label.trim()) {
      setErrors({ label: ["項目名を入力してください"] });
      return;
    }
    if (!amount.trim()) {
      setErrors({ amount: ["金額を入力してください"] });
      return;
    }
    startTransition(async () => {
      const result = await createProjectInvoiceExtra({
        projectId,
        yearMonth,
        label,
        amount,
      });
      if (!result.ok) {
        if (result.error.code === "VALIDATION_ERROR" && result.error.fieldErrors) {
          setErrors(result.error.fieldErrors);
        }
        toast.error(result.error.message);
        return;
      }
      toast.success("請求明細を追加しました");
      setLabel("");
      setAmount("");
      router.refresh();
    });
  }

  function handleDelete(id: string, itemLabel: string) {
    if (!window.confirm(`「${itemLabel}」を削除しますか？`)) return;
    startTransition(async () => {
      const result = await deleteProjectInvoiceExtra({ id, projectId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("請求明細を削除しました");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>請求書の任意明細</CardDescription>
        <CardTitle className="text-base">時給換算とは別の項目・金額</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          交通費・固定費など、稼働時間に紐づかない金額を月ごとに登録できます。請求先に紐づいたプロジェクトの請求書 PDF に載ります。
        </p>
        <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[140px_1fr_120px_auto]">
          <div className="space-y-1">
            <Label htmlFor="extra-month">年月（YYYY-MM）</Label>
            <Input
              id="extra-month"
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
            <Label htmlFor="extra-label">項目名</Label>
            <Input
              id="extra-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="交通費"
              maxLength={120}
              required
            />
            {errors.label?.map((m) => (
              <p key={m} className="text-xs text-destructive">
                {m}
              </p>
            ))}
          </div>
          <div className="space-y-1">
            <Label htmlFor="extra-amount">金額（円）</Label>
            <Input
              id="extra-amount"
              inputMode="numeric"
              pattern="[0-9]*"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5000"
              required
            />
            {errors.amount?.map((m) => (
              <p key={m} className="text-xs text-destructive">
                {m}
              </p>
            ))}
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? "追加中..." : "追加"}
            </Button>
          </div>
        </form>

        {extras.length === 0 ? (
          <p className="text-sm text-muted-foreground">登録された任意明細はありません。</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {extras.map((ex) => (
              <li key={ex.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatYearMonthJa(ex.yearMonth)}
                  </p>
                  <p className="truncate text-sm font-medium">{ex.label}</p>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums">{formatYen(ex.amount)}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(ex.id, ex.label)}
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
