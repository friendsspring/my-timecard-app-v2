"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, MoreVertical } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { setProjectArchived } from "@/actions/projects";
import type { Project } from "@/lib/db/schema";
import { ProjectFormDialog } from "./_form-dialog";

export function ProjectMenu({ project }: { project: Project }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const archived = !!project.archivedAt;

  function toggleArchive() {
    startTransition(async () => {
      const result = await setProjectArchived({ id: project.id, archived: !archived });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(archived ? "アーカイブを解除しました" : "アーカイブしました");
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={pending}>
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">メニューを開く</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-1 py-1">
          <ProjectFormDialog mode="edit" project={project} />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={toggleArchive}>
          {archived ? (
            <>
              <ArchiveRestore className="h-4 w-4" />
              アーカイブ解除
            </>
          ) : (
            <>
              <Archive className="h-4 w-4" />
              アーカイブ
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
