"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/db/schema";
import { EntryFormDialog } from "./_entry-form";

export function ManualEntryDialog({ projects }: { projects: Project[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={projects.length === 0}>
        <Plus className="h-4 w-4" />
        手動で追加
      </Button>
      <EntryFormDialog open={open} onOpenChange={setOpen} projects={projects} />
    </>
  );
}
