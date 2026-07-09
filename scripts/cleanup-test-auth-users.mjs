/**
 * Remove test / disposable auth users that trigger Supabase email bounces.
 *
 * Dry run:  node scripts/cleanup-test-auth-users.mjs
 * Apply:    node scripts/cleanup-test-auth-users.mjs --apply
 */
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const apply = process.argv.includes("--apply");

const DISPOSABLE_PATTERNS = [
  "yopmail.com",
  "mailinator.com",
  "guerrillamail",
  "tempmail",
  "throwaway",
  "10minutemail",
  "fakeinbox",
  "trashmail",
  "example.com",
  "test.com",
  "ssrtex.verify",
  "auth.verify",
];

function isTestOrDisposable(email) {
  const lower = (email ?? "").toLowerCase();
  return DISPOSABLE_PATTERNS.some((p) => lower.includes(p));
}

const dbUrl = process.env.DATABASE_URL;
const supabaseUrl = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  `https://${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}.supabase.co`
).replace(/\/$/, "");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRole = process.env.DATABASE_SERVICE_ROLE;

if (!dbUrl || !serviceRole || !anonKey) {
  console.error("Missing DATABASE_URL, DATABASE_SERVICE_ROLE, or anon key in .env.local");
  process.exit(1);
}

const sql = postgres(dbUrl, { max: 1 });

async function deleteAuthUser(userId) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${serviceRole}`,
    },
  });
  if (!res.ok) {
    throw new Error(`delete ${userId} → ${res.status}: ${await res.text()}`);
  }
}

try {
  const rows = await sql`
    select id, email, created_at
    from auth.users
    order by created_at desc
  `;

  const targets = rows.filter((row) => isTestOrDisposable(row.email));

  console.log(`Found ${targets.length} test/disposable user(s).`);
  if (targets.length === 0) {
    console.log("Nothing to clean up.");
    process.exit(0);
  }

  for (const row of targets) {
    console.log(`  - ${row.email} (${row.id})`);
  }

  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to delete these users.");
    process.exit(0);
  }

  for (const row of targets) {
    await deleteAuthUser(row.id);
    console.log(`Deleted ${row.email}`);
  }

  console.log("\nDone.");
} finally {
  await sql.end();
}
