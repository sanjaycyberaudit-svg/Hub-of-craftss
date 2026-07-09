import { env } from "@/env.mjs";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

function getSupabaseUrl() {
  return (
    env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ||
    `https://${env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}.supabase.co`
  );
}

/** Supabase client for route handlers — writes auth cookies onto the redirect response. */
export function createRouteHandlerSupabaseClient(
  request: NextRequest,
  response: NextResponse,
) {
  return createServerClient(
    getSupabaseUrl(),
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );
}
