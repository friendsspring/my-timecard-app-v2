"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { getEntriesSyncRevision } from "@/actions/entries";

const POLL_MS = 5_000;

/** 打刻データを表示する画面のみ同期対象 */
const SYNC_PREFIXES = ["/dashboard", "/entries", "/summary", "/projects/"];

function shouldSync(pathname: string): boolean {
  return SYNC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function EntriesSyncRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const revisionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!shouldSync(pathname)) return;

    revisionRef.current = null;
    let cancelled = false;

    async function check() {
      if (document.hidden) return;
      try {
        const revision = await getEntriesSyncRevision();
        if (cancelled) return;
        if (revisionRef.current === null) {
          revisionRef.current = revision;
          return;
        }
        if (revisionRef.current !== revision) {
          revisionRef.current = revision;
          router.refresh();
        }
      } catch {
        // 未ログイン等は無視
      }
    }

    void check();

    const interval = setInterval(() => void check(), POLL_MS);
    const onVisible = () => void check();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname, router]);

  return null;
}
