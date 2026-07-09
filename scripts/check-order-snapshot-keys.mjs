import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const [{ total }] = await sql`SELECT count(*)::int AS total FROM order_lines`;
  const [{ withkey }] = await sql`
    SELECT count(*)::int AS withkey FROM order_lines
    WHERE product_image_key_snapshot IS NOT NULL AND product_image_key_snapshot <> ''
  `;
  const samples = await sql`
    SELECT DISTINCT product_image_key_snapshot AS k FROM order_lines
    WHERE product_image_key_snapshot IS NOT NULL AND product_image_key_snapshot <> ''
    LIMIT 15
  `;
  // How many order snapshot keys actually match a media.key
  const [{ matched }] = await sql`
    SELECT count(DISTINCT ol.product_image_key_snapshot)::int AS matched
    FROM order_lines ol
    WHERE ol.product_image_key_snapshot IS NOT NULL
      AND EXISTS (SELECT 1 FROM medias m WHERE m.key = ol.product_image_key_snapshot)
  `;
  const [{ unmatched }] = await sql`
    SELECT count(DISTINCT ol.product_image_key_snapshot)::int AS unmatched
    FROM order_lines ol
    WHERE ol.product_image_key_snapshot IS NOT NULL
      AND ol.product_image_key_snapshot <> ''
      AND NOT EXISTS (SELECT 1 FROM medias m WHERE m.key = ol.product_image_key_snapshot)
  `;
  console.log("order_lines total:", total);
  console.log("order_lines with snapshot key:", withkey);
  console.log("distinct snapshot keys matched to media.key:", matched);
  console.log("distinct snapshot keys NOT matched to any media.key:", unmatched);
  console.log("sample snapshot keys:", JSON.stringify(samples.map((s) => s.k), null, 2));
} catch (e) {
  console.log("ERR", e.message);
} finally {
  await sql.end();
}
