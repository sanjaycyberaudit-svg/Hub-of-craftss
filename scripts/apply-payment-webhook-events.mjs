import postgres from "postgres";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const migrationSql = readFileSync(
  join(root, "supabase", "11-payment-webhook-events.sql"),
  "utf8",
);

const sql = postgres(url, { max: 1, prepare: false });

try {
  await sql.unsafe(migrationSql);
  const rows = await sql`
    select to_regclass('public.payment_webhook_events') as table_name
  `;
  if (!rows[0]?.table_name) {
    throw new Error("payment_webhook_events table was not created");
  }
  console.log("OK: payment_webhook_events idempotency table applied");
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
