import { createClient } from "@/lib/supabase/client";

/** Revoke refresh tokens server-side and clear local session cookies. */
export async function signOutGlobally(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) {
    throw error;
  }
}
