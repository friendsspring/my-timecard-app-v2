"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { startEntry } from "@/actions/entries";
import type { Project } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type Props = {
  projects: Project[];
  disabled: boolean;
};

export function StartEntryForm({ projects, disabled }: Props) {
  const [projectId, setProjectId] = useState<string | null>(projects[0]?.id ?? null);
  const [memo, setMemo] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleStart() {
    if (!projectId) {
      toast.error("先にプロジェクトを作成してください");
      return;
    }
    startTransition(async () => {
      const result = await startEntry({ projectId, memo: memo || undefined });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("打刻を開始しました");
      setMemo("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>新しい打刻を開始</CardDescription>
        <CardTitle className="text-base font-medium">プロジェクトを選んで開始</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            まずはプロジェクトを作成してください。
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <Label>プロジェクト</Label>
              <div className="flex flex-wrap gap-2">
                {projects.map((p) => {
                  const selected = projectId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProjectId(p.id)}
                      disabled={disabled}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                        selected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-accent",
                        disabled && "opacity-60",
                      )}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: p.color }}
                        aria-hidden
                      />
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-memo">メモ（任意）</Label>
              <Textarea
                id="start-memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={2}
                disabled={disabled}
              />
            </div>
          </>
        )}

        <Button
          size="lg"
          className="w-full"
          onClick={handleStart}
          disabled={pending || disabled || projects.length === 0}
        >
          <Play className="h-4 w-4" />
          {pending ? "開始中..." : "開始"}
        </Button>
        {disabled ? (
          <p className="text-xs text-muted-foreground">
            進行中の打刻があります。先に終了してください。
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
