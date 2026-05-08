"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function GoogleSignInButton() {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${appUrl}/api/auth/callback?next=/dashboard`,
        },
      });
      if (error) {
        toast.error("ログインに失敗しました", { description: error.message });
        setPending(false);
      }
    } catch (e) {
      toast.error("ログインに失敗しました");
      setPending(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={pending} size="lg" className="w-full">
      <GoogleIcon />
      {pending ? "リダイレクト中..." : "Google でログイン"}
    </Button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M21.8 10.2H12v3.7h5.6c-.5 2.3-2.7 3.9-5.6 3.9-3.4 0-6.2-2.8-6.2-6.2S8.6 5.4 12 5.4c1.6 0 3.1.6 4.2 1.6l2.7-2.7C17 2.7 14.6 1.7 12 1.7 6.5 1.7 2.1 6.1 2.1 11.6S6.5 21.5 12 21.5c5.7 0 9.5-4 9.5-9.6 0-.6-.1-1.2-.2-1.7Z"
      />
      <path
        fill="#FF3D00"
        d="M3.2 7.3l3 2.2C7.1 7.6 9.4 6.1 12 6.1c1.6 0 3.1.6 4.2 1.6l2.8-2.8C17 3.1 14.6 2.1 12 2.1 8 2.1 4.6 4.4 3.2 7.3Z"
      />
      <path
        fill="#4CAF50"
        d="M12 22c2.6 0 5-1 6.8-2.6l-3.1-2.6c-.9.7-2.1 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.4l-3 2.3C4.5 19.4 8 22 12 22Z"
      />
      <path
        fill="#1976D2"
        d="M21.8 10.2H12v3.7h5.6c-.3 1.2-1 2.2-1.9 2.9l3.1 2.6c1.8-1.6 3-4 3-7.5 0-.6-.1-1.2-.2-1.7Z"
      />
    </svg>
  );
}
