/**
 * Remove junk profile rows (yopmail, verify tests, orphans without auth user).
 * Run: node scripts/cleanup-junk-profiles.mjs --apply
 */
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const apply = process.argv.includes("--apply");

const JUNK_PATTERNS = [
  "yopmail.com",
  "ssrtex.verify",
  "auth.verify",
  "@example.com",
];

function isJunk(email) {
  const lower = (email ?? "").toLowerCase();
  return JUNK_PATTERNS.some((p) => lower.includes(p));
}

const url = process.env.DATABASE_URL;
const supabaseUrl = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  `https://${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}.supabase.co`
).replace(/\/$/, "");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRole = process.env.DATABASE_SERVICE_ROLE;

if (!url || !serviceRole || !anonKey) {
  console.error("Missing DATABASE_URL, DATABASE_SERVICE_ROLE, or anon key");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

async function deleteAuthUser(userId) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${serviceRole}`,
    },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`delete auth ${userId} → ${res.status}: ${await res.text()}`);
  }
}

try {
  const profiles = await sql`
    select p.id, p.email, p.name, p.is_admin
    from profiles p
    order by p.created_at desc
  `;

  const authIds = new Set(
    (await sql`select id from auth.users`).map((r) => r.id),
  );

  const junk = profiles.filter(
    (p) => isJunk(p.email) || !authIds.has(p.id),
  );

  console.log(`Found ${junk.length} junk/orphan profile(s):`);
  for (const row of junk) {
    const orphan = !authIds.has(row.id);
    console.log(
      `  - ${row.email ?? row.id} (${row.name})${orphan ? " [orphan]" : ""}`,
    );
  }

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to delete.");
    process.exit(0);
  }

  for (const row of junk) {
    if (authIds.has(row.id)) {
      await deleteAuthUser(row.id);
      console.log(`Deleted auth user: ${row.email}`);
    }
    await sql`delete from profiles where id = ${row.id}`;
    console.log(`Deleted profile: ${row.email ?? row.id}`);
  }

  console.log("\nDone.");
} finally {
  await sql.end();
}
