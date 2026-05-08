"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { deleteEntry } from "@/actions/entries";
import type { Project } from "@/lib/db/schema";
import { EntryFormDialog } from "./_entry-form";

type EntryValues = {
  id: string;
  projectId: string;
  startedAt: string;
  endedAt: string | null;
  memo: string | null;
};

type Props = {
  entry: EntryValues;
  projects: Project[];
};

export function EntryActions({ entry, projects }: Props) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!window.confirm("この打刻を削除しますか？")) return;
    startTransition(async () => {
      const result = await deleteEntry({ id: entry.id });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("打刻を削除しました");
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={pending}>
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">メニュー</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
            編集
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} className="text-destructive">
            <Trash2 className="h-4 w-4" />
            削除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EntryFormDialog
        open={editing}
        onOpenChange={setEditing}
        projects={projects}
        initial={entry}
      />
    </>
  );
}
