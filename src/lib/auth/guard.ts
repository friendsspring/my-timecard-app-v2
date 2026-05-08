import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isEmailAllowed } from "./allowed-emails";

export type AuthUser = {
  id: string;
  email: string;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  const email = data.user.email ?? null;
  if (!isEmailAllowed(email)) {
    return null;
  }
  return { id: data.user.id, email: email! };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
