/**
 * Create Hub of craftss admin user (idempotent).
 * Usage: node scripts/create-hub-admin.mjs
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

dotenv.config({ path: ".env.local", override: true });

const email = "sanjay.cyber.audit@gmail.com";
const password = `HocAdmin_${randomBytes(4).toString("hex")}!2026`;

const ref = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF;
const key = process.env.DATABASE_SERVICE_ROLE;
if (!ref || !key) {
  console.error("Missing Supabase env in .env.local");
  process.exit(1);
}

const supabase = createClient(`https://${ref}.supabase.co`, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: listed, error: listErr } = await supabase.auth.admin.listUsers({
  perPage: 1000,
});
if (listErr) {
  console.error(listErr.message);
  process.exit(1);
}

let user = listed.users.find(
  (u) => u.email?.toLowerCase() === email.toLowerCase(),
);

if (!user) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Sanjay" },
    app_metadata: { isAdmin: true },
  });
  if (error) {
    console.error("createUser:", error.message);
    process.exit(1);
  }
  user = data.user;
  console.log("Created user", user.id);
  console.log("TEMP_PASSWORD=" + password);
} else {
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    app_metadata: { ...user.app_metadata, isAdmin: true },
  });
  if (error) {
    console.error("updateUser:", error.message);
    process.exit(1);
  }
  console.log("Updated existing user", user.id);
  console.log("TEMP_PASSWORD=" + password);
}

const { error: profileErr } = await supabase.from("profiles").upsert({
  id: user.id,
  email,
  name: "Sanjay",
  is_admin: true,
});
if (profileErr) {
  console.error("profile upsert:", profileErr.message);
  process.exit(1);
}

console.log("Admin ready:", email);
console.log("Sign in at: https://hub-of-craftss.hubofcraftss.workers.dev/sign-in");
