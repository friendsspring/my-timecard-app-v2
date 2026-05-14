"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteBillingClient } from "@/actions/billing-clients";
import { Button } from "@/components/ui/button";

export function BillingDeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`「${name}」を削除しますか？紐付いたプロジェクトの請求先は未設定になります。`)) {
          return;
        }
        startTransition(async () => {
          const res = await deleteBillingClient({ id });
          if (!res.ok) {
            toast.error(res.error.message);
            return;
          }
          toast.success("削除しました");
          router.refresh();
        });
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
