import { env } from "@/env.mjs";

import { CookieOptions, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient({
  cookieStore,
  isAdmin = false,
}: {
  cookieStore: ReturnType<typeof cookies>;
  isAdmin?: boolean;
}) {
  return createServerClient(
    `https://${env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}.supabase.co`,
    isAdmin ? env.DATABASE_SERVICE_ROLE : env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server Components cannot set cookies; middleware refreshes the session.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Server Components cannot set cookies; middleware refreshes the session.
          }
        },
      },
    },
  );
}

export default createClient;
