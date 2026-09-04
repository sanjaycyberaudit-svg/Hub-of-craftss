/**
 * One-off: assign internal_ref to existing paid orders missing one.
 * Uses each order's created_at (IST month) so older months get correct YYMM prefixes.
 *
 * Usage: node scripts/backfill-order-internal-ref.mjs
 */
import postgres from "postgres";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

function yymmFromIst(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const yy = String(year % 100).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  return `${yy}${mm}`;
}

function formatRef(yymm, seq) {
  return `${yymm}${String(seq).padStart(4, "0")}`;
}

const sql = postgres(url, { max: 1, prepare: false });

try {
  const rows = await sql`
    select id, created_at, payment_status
    from orders
    where internal_ref is null
      and lower(coalesce(payment_status, '')) in (
        'paid', 'success', 'captured', 'no_payment_required'
      )
    order by created_at asc
  `;

  console.log(`Found ${rows.length} paid order(s) without internal_ref`);

  let assigned = 0;
  for (const row of rows) {
    const yymm = yymmFromIst(row.created_at);
    const counter = await sql`
      insert into order_internal_ref_counters (yymm, last_seq, updated_at)
      values (${yymm}, 1, now())
      on conflict (yymm) do update
        set last_seq = order_internal_ref_counters.last_seq + 1,
            updated_at = now()
      returning last_seq
    `;
    const seq = Number(counter[0].last_seq);
    const candidate = formatRef(yymm, seq);

    const updated = await sql`
      update orders
      set internal_ref = ${candidate}
      where id = ${row.id}
        and internal_ref is null
      returning id, internal_ref
    `;

    if (updated[0]?.internal_ref) {
      assigned += 1;
      console.log(`  ${row.id} → ${updated[0].internal_ref}`);
    } else {
      console.log(`  ${row.id} skipped (already set concurrently)`);
    }
  }

  const summary = await sql`
    select
      count(*) filter (where internal_ref is not null) as with_ref,
      count(*) filter (
        where internal_ref is null
          and lower(coalesce(payment_status, '')) in (
            'paid', 'success', 'captured', 'no_payment_required'
          )
      ) as paid_missing
    from orders
  `;
  const counters = await sql`
    select yymm, last_seq from order_internal_ref_counters order by yymm
  `;

  console.log(
    JSON.stringify(
      { assigned, summary: summary[0], counters },
      null,
      2,
    ),
  );
} catch (e) {
  console.error("Backfill failed:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
