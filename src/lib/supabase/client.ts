import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

function getSupabaseUrl() {
  const fromUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (fromUrl) return fromUrl.replace(/\/$/, "");

  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF?.trim();
  if (projectRef) return `https://${projectRef}.supabase.co`;

  return "";
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
}

export function createClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase client env (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PROJECT_REF, and NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }

  return createBrowserClient(url, anonKey);
}
