"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Square } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { stopEntry, updateEntryMemo } from "@/actions/entries";
import { formatStopwatch } from "@/lib/format";
import { useRouter } from "next/navigation";

type Props = {
  entry: { id: string; startedAt: string; memo: string | null };
  project: { name: string; color: string };
};

export function ActiveTimer({ entry, project }: Props) {
  const startedAtMs = new Date(entry.startedAt).getTime();
  // SSRと初回ハイドレーション時は startedAtMs を初期値にして elapsed = 0 を描画する。
  // マウント後に useEffect で本物の現在時刻に切り替えることでハイドレーション不一致を避ける。
  const [now, setNow] = useState<number>(startedAtMs);
  const [memo, setMemo] = useState<string>(entry.memo ?? "");
  const [stopping, startStop] = useTransition();
  const [savingMemo, setSavingMemo] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  function scheduleMemoSave(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSavingMemo(true);
      const trimmed = value.trim();
      const result = await updateEntryMemo({
        id: entry.id,
        memo: trimmed === "" ? null : trimmed,
      });
      setSavingMemo(false);
      if (!result.ok) {
        toast.error(result.error.message);
      }
    }, 600);
  }

  function handleStop() {
    startStop(async () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        const trimmed = memo.trim();
        await updateEntryMemo({
          id: entry.id,
          memo: trimmed === "" ? null : trimmed,
        });
      }
      const result = await stopEntry({ id: entry.id });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("打刻を終了しました");
      router.refresh();
    });
  }

  const elapsedMs = Math.max(0, now - startedAtMs);

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader className="pb-2">
        <CardDescription>進行中の打刻</CardDescription>
        <CardTitle className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: project.color }}
            aria-hidden
          />
          <span className="truncate">{project.name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="font-mono text-4xl tabular-nums tracking-tight">
          {formatStopwatch(elapsedMs)}
        </div>
        <Textarea
          value={memo}
          onChange={(e) => {
            setMemo(e.target.value);
            scheduleMemoSave(e.target.value);
          }}
          placeholder="作業メモ（自動保存）"
          rows={2}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {savingMemo ? "保存中..." : "メモは自動保存されます"}
          </span>
          <Button onClick={handleStop} disabled={stopping} variant="destructive">
            <Square className="h-4 w-4" />
            {stopping ? "終了中..." : "終了"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
