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
  join(root, "supabase", "16-order-internal-ref.sql"),
  "utf8",
);

const sql = postgres(url, { max: 1, prepare: false });

try {
  await sql.unsafe(migrationSql);
  const rows = await sql`
    select
      exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'orders'
          and column_name = 'internal_ref'
      ) as has_column,
      to_regclass('public.order_internal_ref_counters') as counters_table
  `;
  if (!rows[0]?.has_column || !rows[0]?.counters_table) {
    throw new Error("internal_ref column or counters table missing after migrate");
  }
  console.log("OK: orders.internal_ref + order_internal_ref_counters applied");
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
