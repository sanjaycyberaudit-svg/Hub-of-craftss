import postgres from "postgres";
import { readFileSync } from "fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

try {
  const [before] = await sql`
    select
      (select count(*)::int from orders) as orders,
      (select count(*)::int from order_lines) as order_lines,
      (select count(*)::int from orders where payment_status = 'paid') as paid_orders
  `;
  console.log("BEFORE", JSON.stringify(before));

  const migrationSql = readFileSync(
    "supabase/10-product-lifecycle-cleanup.sql",
    "utf8",
  );
  await sql.unsafe(migrationSql);

  const [after] = await sql`
    select
      (select count(*)::int from orders) as orders,
      (select count(*)::int from order_lines) as order_lines,
      (select count(*)::int from orders where payment_status = 'paid') as paid_orders,
      (select count(*)::int from order_lines where product_name_snapshot is not null) as lines_with_snapshots
  `;
  const cols = await sql`
    select column_name from information_schema.columns
    where table_name = 'products' and column_name in ('archived_at', 'media_purge_at')
  `;

  console.log("AFTER", JSON.stringify(after));
  console.log("NEW_COLUMNS", cols.map((r) => r.column_name).join(", "));

  if (
    before.orders !== after.orders ||
    before.order_lines !== after.order_lines ||
    before.paid_orders !== after.paid_orders
  ) {
    console.error("ORDER COUNT MISMATCH — investigate");
    process.exit(1);
  }

  console.log("OK: migration applied, existing orders untouched");
} catch (e) {
  console.error("FAILED", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
