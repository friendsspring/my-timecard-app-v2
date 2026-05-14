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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBillingClient, updateBillingClient } from "@/actions/billing-clients";
import type { BillingClient } from "@/lib/db/schema";

type Props =
  | { mode: "create"; client?: never }
  | { mode: "edit"; client: BillingClient };

const DEFAULT_TEMPLATE = "{YYYYMM}_{CLIENT}.pdf";

export function BillingClientFormDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const initial = props.mode === "edit" ? props.client : null;
  const [name, setName] = useState(initial?.name ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "ご請求書（{YYYYMM}）");
  const [issuerName, setIssuerName] = useState(initial?.issuerName ?? "");
  const [taxMode, setTaxMode] = useState<"inclusive" | "exclusive">(initial?.taxMode ?? "exclusive");
  const [pdfFilenameTemplate, setPdfFilenameTemplate] = useState(
    initial?.pdfFilenameTemplate ?? DEFAULT_TEMPLATE,
  );
  const [bankInfo, setBankInfo] = useState(initial?.bankInfo ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  function reset() {
    if (props.mode === "edit") {
      setName(props.client.name);
      setSubject(props.client.subject);
      setIssuerName(props.client.issuerName);
      setTaxMode(props.client.taxMode);
      setPdfFilenameTemplate(props.client.pdfFilenameTemplate);
      setBankInfo(props.client.bankInfo ?? "");
      setNote(props.client.note ?? "");
    } else {
      setName("");
      setSubject("ご請求書（{YYYYMM}）");
      setIssuerName("");
      setTaxMode("exclusive");
      setPdfFilenameTemplate(DEFAULT_TEMPLATE);
      setBankInfo("");
      setNote("");
    }
    setErrors({});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const input = {
        name,
        subject,
        issuerName,
        taxMode,
        pdfFilenameTemplate,
        bankInfo: bankInfo || undefined,
        note: note || undefined,
      };
      const result =
        props.mode === "edit"
          ? await updateBillingClient({ id: props.client.id, ...input })
          : await createBillingClient(input);
      if (!result.ok) {
        if (result.error.code === "VALIDATION_ERROR" && result.error.fieldErrors) {
          setErrors(result.error.fieldErrors);
        }
        toast.error(result.error.message);
        return;
      }
      toast.success(props.mode === "edit" ? "請求先を更新しました" : "請求先を作成しました");
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
        if (!o) setErrors({});
      }}
    >
      <DialogTrigger asChild>
        {props.mode === "create" ? (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            請求先を追加
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4" />
            編集
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{props.mode === "edit" ? "請求先を編集" : "請求先を追加"}</DialogTitle>
          <DialogDescription>
            請求書 PDF の宛先・税区分・ファイル名テンプレートを設定します。プロジェクト詳細からこの請求先に紐付けられます。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bc-name">請求先名</Label>
            <Input id="bc-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
            {errors.name?.map((err) => (
              <p key={err} className="text-xs text-destructive">
                {err}
              </p>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bc-subject">件名（{`{YYYYMM}`} 等可）</Label>
            <Input id="bc-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={500} required />
            {errors.subject?.map((err) => (
              <p key={err} className="text-xs text-destructive">
                {err}
              </p>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bc-issuer">請求元の名前</Label>
            <Input id="bc-issuer" value={issuerName} onChange={(e) => setIssuerName(e.target.value)} maxLength={120} required />
            {errors.issuerName?.map((err) => (
              <p key={err} className="text-xs text-destructive">
                {err}
              </p>
            ))}
          </div>
          <div className="space-y-2">
            <Label>税区分</Label>
            <Select value={taxMode} onValueChange={(v) => setTaxMode(v as "inclusive" | "exclusive")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exclusive">外税（税抜明細＋税）</SelectItem>
                <SelectItem value="inclusive">内税（税込按分）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bc-template">PDF ファイル名テンプレート</Label>
            <Input
              id="bc-template"
              value={pdfFilenameTemplate}
              onChange={(e) => setPdfFilenameTemplate(e.target.value)}
              maxLength={200}
              required
            />
            <p className="text-xs text-muted-foreground">
              例: {"{YYYYMM}_{CLIENT}.pdf"} — {"{YYYY}"} {"{MM}"} {"{YYYY-MM}"} {"{CLIENT}"}
            </p>
            {errors.pdfFilenameTemplate?.map((err) => (
              <p key={err} className="text-xs text-destructive">
                {err}
              </p>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bc-bank">振込先（任意）</Label>
            <Textarea id="bc-bank" value={bankInfo} onChange={(e) => setBankInfo(e.target.value)} rows={3} maxLength={4000} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bc-note">備考（任意・PDF 未印字可）</Label>
            <Textarea id="bc-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
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
