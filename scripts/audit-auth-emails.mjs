/**
 * Audit auth.users for emails likely causing Supabase bounces.
 * Run: node scripts/audit-auth-emails.mjs
 */
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

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

function isSuspicious(email) {
  const lower = (email ?? "").toLowerCase();
  return DISPOSABLE_PATTERNS.some((p) => lower.includes(p));
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

try {
  const [stats] = await sql`
    select
      count(*)::int as total,
      count(*) filter (where email_confirmed_at is null)::int as unconfirmed,
      count(*) filter (where last_sign_in_at is null)::int as never_signed_in
    from auth.users
  `;

  const rows = await sql`
    select email, created_at, email_confirmed_at, last_sign_in_at
    from auth.users
    order by created_at desc
  `;

  const domainCounts = {};
  for (const row of rows) {
    const domain = (row.email ?? "").split("@")[1]?.toLowerCase() ?? "?";
    domainCounts[domain] = (domainCounts[domain] ?? 0) + 1;
  }

  const suspicious = rows.filter((row) => isSuspicious(row.email));

  console.log("=== Auth email audit ===\n");
  console.log("Total users:", stats.total);
  console.log("Unconfirmed:", stats.unconfirmed);
  console.log("Never signed in:", stats.never_signed_in);
  console.log("\nTop domains:");
  for (const [domain, count] of Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)) {
    console.log(`  ${count}x  ${domain}`);
  }

  console.log(`\nSuspicious / disposable / test emails: ${suspicious.length}`);
  for (const row of suspicious.slice(0, 30)) {
    console.log(`  - ${row.email}  (created ${row.created_at})`);
  }
  if (suspicious.length > 30) {
    console.log(`  ... and ${suspicious.length - 30} more`);
  }
} finally {
  await sql.end();
}
