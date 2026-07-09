import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

try {
  const orphans = await sql`
    select
      p.id,
      p.name,
      exists (
        select 1 from order_lines ol
        inner join orders o on o.id = ol."orderId"
        where ol.product_id = p.id and o.payment_status = 'paid'
      ) as has_paid_orders,
      exists (
        select 1 from order_lines ol where ol.product_id = p.id
      ) as has_any_order_lines
    from products p
    where p.collection_id is null
      and p.is_draft = false
      and p.archived_at is null
  `;

  const paidArchiveIds = orphans.filter((p) => p.has_paid_orders).map((p) => p.id);
  const unpaidOnlyIds = orphans
    .filter((p) => p.has_any_order_lines && !p.has_paid_orders)
    .map((p) => p.id);
  const deleteIds = orphans.filter((p) => !p.has_any_order_lines).map((p) => p.id);

  const nowIso = new Date().toISOString();
  const purgeIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  if (paidArchiveIds.length > 0) {
    await sql`
      update order_lines ol
      set
        product_name_snapshot = coalesce(ol.product_name_snapshot, p.name),
        product_slug_snapshot = coalesce(ol.product_slug_snapshot, p.slug),
        product_code_snapshot = coalesce(ol.product_code_snapshot, p.product_code),
        product_image_key_snapshot = coalesce(ol.product_image_key_snapshot, m.key)
      from products p
      left join medias m on m.id = p.featured_image_id
      where ol.product_id = p.id
        and p.id = any(${paidArchiveIds})
    `;

    await sql`
      update products
      set
        is_draft = true,
        featured = false,
        archived_at = ${nowIso},
        media_purge_at = ${purgeIso}
      where id = any(${paidArchiveIds})
    `;
  }

  if (unpaidOnlyIds.length > 0) {
    const unpaidOrders = await sql`
      select distinct ol."orderId" as order_id
      from order_lines ol
      inner join orders o on o.id = ol."orderId"
      where ol.product_id = any(${unpaidOnlyIds})
        and o.payment_status = 'paid'
    `;
    if (unpaidOrders.length > 0) {
      throw new Error("Unexpected paid orders on unpaid-only cleanup set");
    }

    await sql`
      delete from order_lines
      where product_id = any(${unpaidOnlyIds})
    `;

    await sql`
      delete from products
      where id = any(${unpaidOnlyIds})
    `;
  }

  if (deleteIds.length > 0) {
    await sql`delete from products where id = any(${deleteIds})`;
  }

  const [remaining] = await sql`
    select count(*)::int as count
    from products
    where collection_id is null
      and is_draft = false
      and archived_at is null
  `;

  console.log(
    JSON.stringify(
      {
        ok: true,
        scanned: orphans.length,
        archivedWithPaidOrders: paidArchiveIds.length,
        deletedUnpaidOnly: unpaidOnlyIds.length,
        deletedNoOrders: deleteIds.length,
        remainingUncategorizedLive: remaining.count,
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.error("FAILED", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
