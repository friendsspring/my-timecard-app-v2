"use client";

import { useTransition } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const m = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (m?.[1]) {
    try {
      return decodeURIComponent(m[1].trim());
    } catch {
      return m[1].trim();
    }
  }
  const m2 = /filename="([^"]+)"/i.exec(header);
  return m2?.[1]?.trim() ?? null;
}

export function InvoiceDownloadButton({
  billingClientId,
  yearMonth,
}: {
  billingClientId: string;
  yearMonth: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const url = `/api/invoices/pdf?billingClientId=${encodeURIComponent(billingClientId)}&yearMonth=${encodeURIComponent(yearMonth)}`;
          try {
            const res = await fetch(url);
            if (!res.ok) {
              toast.error("PDF の取得に失敗しました");
              return;
            }
            const blob = await res.blob();
            const name = parseFilenameFromContentDisposition(res.headers.get("Content-Disposition")) ?? "invoice.pdf";
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = name;
            a.click();
            URL.revokeObjectURL(a.href);
            toast.success("ダウンロードしました");
          } catch {
            toast.error("PDF の取得に失敗しました");
          }
        });
      }}
    >
      <Download className="h-4 w-4" />
      {pending ? "生成中..." : "PDF をダウンロード"}
    </Button>
  );
}
