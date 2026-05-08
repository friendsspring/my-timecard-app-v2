import Link from "next/link";
import { Clock3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleSignInButton } from "./google-sign-in-button";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guard";

const ERROR_MESSAGES: Record<string, string> = {
  forbidden: "このアカウントではログインできません（許可リストに含まれていません）",
  exchange_failed: "認証に失敗しました。もう一度お試しください。",
  missing_code: "認証コードが見つかりません。もう一度お試しください。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] ?? "不明なエラーが発生しました。" : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-secondary px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Clock3 className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">My Timecard</CardTitle>
          <CardDescription>個人用タイムカードアプリ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <GoogleSignInButton />

          <p className="text-center text-xs text-muted-foreground">
            ログインにはあらかじめ許可されたメールアドレスが必要です。
          </p>
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/" className="underline-offset-4 hover:underline">
              トップへ戻る
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
