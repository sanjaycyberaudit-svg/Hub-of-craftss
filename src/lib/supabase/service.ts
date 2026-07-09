import { createClient } from "@supabase/supabase-js";
import { env } from "@/env.mjs";

/** Server-only Supabase client (service role) — works without direct Postgres DNS. */
export function createServiceRoleClient() {
  const url =
    env.NEXT_PUBLIC_SUPABASE_URL ||
    `https://${env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}.supabase.co`;

  return createClient(url, env.DATABASE_SERVICE_ROLE, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
