"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createManualEntry, updateEntry } from "@/actions/entries";
import type { Project } from "@/lib/db/schema";
import { fromJstDatetimeLocal, toJstDatetimeLocal } from "@/lib/time/jst";

type EntryEditValues = {
  id: string;
  projectId: string;
  startedAt: string; // ISO
  endedAt: string | null;
  memo: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  initial?: EntryEditValues;
};

export function EntryFormDialog({ open, onOpenChange, projects, initial }: Props) {
  const isEdit = !!initial;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [projectId, setProjectId] = useState<string>(
    initial?.projectId ?? projects[0]?.id ?? "",
  );
  const [start, setStart] = useState<string>(
    initial?.startedAt
      ? toJstDatetimeLocal(new Date(initial.startedAt))
      : toJstDatetimeLocal(new Date()),
  );
  const [end, setEnd] = useState<string>(
    initial?.endedAt
      ? toJstDatetimeLocal(new Date(initial.endedAt))
      : toJstDatetimeLocal(new Date()),
  );
  const [memo, setMemo] = useState<string>(initial?.memo ?? "");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const startedAt = fromJstDatetimeLocal(start);
      const endedAt = end ? fromJstDatetimeLocal(end) : null;

      const result = isEdit
        ? await updateEntry({
            id: initial!.id,
            projectId,
            startedAt,
            endedAt: endedAt ?? undefined,
            memo: memo.trim() === "" ? null : memo,
          })
        : await createManualEntry({
            projectId,
            startedAt,
            endedAt: endedAt!,
            memo: memo.trim() === "" ? undefined : memo,
          });

      if (!result.ok) {
        if (result.error.code === "VALIDATION_ERROR" && result.error.fieldErrors) {
          setErrors(result.error.fieldErrors);
        }
        toast.error(result.error.message);
        return;
      }

      toast.success(isEdit ? "打刻を更新しました" : "打刻を追加しました");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "打刻を編集" : "打刻を手動で追加"}</DialogTitle>
          <DialogDescription>
            時刻は日本時間（JST）で入力してください。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>プロジェクト</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="プロジェクトを選択" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: p.color }}
                        aria-hidden
                      />
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="entry-start">開始</Label>
              <Input
                id="entry-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry-end">終了</Label>
              <Input
                id="entry-end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required={!isEdit}
              />
            </div>
          </div>
          {errors.endedAt?.map((e) => (
            <p key={e} className="text-xs text-destructive">
              {e}
            </p>
          ))}

          <div className="space-y-2">
            <Label htmlFor="entry-memo">メモ</Label>
            <Textarea
              id="entry-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              maxLength={2000}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
              キャンセル
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
