/**
 * Grant admin access to a user by email.
 * Usage: node scripts/make-admin.mjs your@email.com
 * Requires DATABASE_SERVICE_ROLE and NEXT_PUBLIC_SUPABASE_PROJECT_REF in .env.local
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) {
    console.error("Missing .env.local");
    process.exit(1);
  }
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/make-admin.mjs <email>");
    process.exit(1);
  }

  loadEnv();
  const ref = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF;
  const key = process.env.DATABASE_SERVICE_ROLE;
  if (!ref || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_PROJECT_REF and DATABASE_SERVICE_ROLE in .env.local");
    process.exit(1);
  }

  const supabase = createClient(`https://${ref}.supabase.co`, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
  if (listErr) {
    console.error(listErr.message);
    process.exit(1);
  }

  const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, isAdmin: true },
  });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    is_admin: true,
  });

  console.log(`Admin enabled for ${email} (${user.id})`);
  console.log("Sign out and sign in again, then open /admin");
}

main();
