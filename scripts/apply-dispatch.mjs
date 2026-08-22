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
  join(root, "supabase", "15-dispatch.sql"),
  "utf8",
);

const sql = postgres(url, { max: 1, prepare: false });

try {
  await sql.unsafe(migrationSql);
  const rows = await sql`
    select
      to_regclass('public.dispatch_couriers') as couriers_table,
      to_regclass('public.order_dispatch_events') as events_table
  `;
  if (!rows[0]?.couriers_table || !rows[0]?.events_table) {
    throw new Error("Dispatch tables were not created");
  }
  console.log("OK: dispatch tables applied");
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
