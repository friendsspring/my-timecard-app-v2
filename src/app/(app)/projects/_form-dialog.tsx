"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createProject, updateProject } from "@/actions/projects";
import type { Project } from "@/lib/db/schema";

const PRESET_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#64748b",
];

type Props =
  | { mode: "create"; project?: never }
  | { mode: "edit"; project: Project };

export function ProjectFormDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const initial = props.mode === "edit" ? props.project : null;
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0]!);
  const [rate, setRate] = useState<string>(String(initial?.defaultHourlyRate ?? "5000"));
  const [note, setNote] = useState(initial?.note ?? "");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  function reset() {
    if (props.mode === "edit") {
      setName(props.project.name);
      setColor(props.project.color);
      setRate(String(props.project.defaultHourlyRate));
      setNote(props.project.note ?? "");
    } else {
      setName("");
      setColor(PRESET_COLORS[0]!);
      setRate("5000");
      setNote("");
    }
    setErrors({});
  }

  function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setErrors({});

    startTransition(async () => {
      const input = {
        name,
        color,
        defaultHourlyRate: rate,
        note: note || undefined,
      };

      const result =
        props.mode === "edit"
          ? await updateProject({ id: props.project.id, ...input })
          : await createProject(input);

      if (!result.ok) {
        if (result.error.code === "VALIDATION_ERROR" && result.error.fieldErrors) {
          setErrors(result.error.fieldErrors);
        }
        toast.error(result.error.message);
        return;
      }

      toast.success(props.mode === "edit" ? "プロジェクトを更新しました" : "プロジェクトを作成しました");
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setErrors({});
        }
      }}
    >
      <DialogTrigger asChild>
        {props.mode === "create" ? (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        ) : (
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
            編集
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {props.mode === "edit" ? "プロジェクトを編集" : "プロジェクトを作成"}
          </DialogTitle>
          <DialogDescription>
            プロジェクト名・カラー・既定時給を設定します。月単位で時給を上書きしたい場合は、作成後にプロジェクト詳細から設定できます。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">プロジェクト名</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              autoFocus
            />
            {errors.name?.map((e) => (
              <p key={e} className="text-xs text-destructive">
                {e}
              </p>
            ))}
          </div>

          <div className="space-y-2">
            <Label>カラー</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className="h-8 w-8 rounded-full border-2 transition"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "hsl(var(--ring))" : "transparent",
                  }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-rate">既定時給（JPY/h）</Label>
            <Input
              id="project-rate"
              inputMode="numeric"
              pattern="[0-9]*"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              required
            />
            {errors.defaultHourlyRate?.map((e) => (
              <p key={e} className="text-xs text-destructive">
                {e}
              </p>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-note">メモ（任意）</Label>
            <Textarea
              id="project-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              disabled={pending}
            >
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
