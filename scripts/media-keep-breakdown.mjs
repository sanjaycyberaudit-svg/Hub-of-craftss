import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const [{ total }] = await sql`SELECT count(*)::int AS total FROM medias`;

  const [{ c }] = await sql`
    SELECT count(DISTINCT m.id)::int AS c FROM medias m
    WHERE EXISTS (SELECT 1 FROM products p WHERE p.featured_image_id = m.id)`;
  const [{ g }] = await sql`
    SELECT count(DISTINCT m.id)::int AS g FROM medias m
    WHERE EXISTS (SELECT 1 FROM product_medias pm WHERE pm."mediaId" = m.id)`;
  const [{ cat }] = await sql`
    SELECT count(DISTINCT m.id)::int AS cat FROM medias m
    WHERE EXISTS (SELECT 1 FROM collections c WHERE c.featured_image_id = m.id)`;
  const [{ tst }] = await sql`
    SELECT count(DISTINCT m.id)::int AS tst FROM medias m
    WHERE EXISTS (SELECT 1 FROM testimonials t WHERE t.featured_image_id = m.id)`;
  const [{ oh }] = await sql`
    SELECT count(DISTINCT m.id)::int AS oh FROM medias m
    WHERE EXISTS (SELECT 1 FROM order_lines ol WHERE ol.product_image_key_snapshot = m.key)`;

  // banner ids from api_settings JSON string
  const bs = await sql`SELECT value FROM api_settings WHERE key='home_banner_slides' LIMIT 1`;
  let val = bs[0]?.value;
  if (typeof val === "string") { try { val = JSON.parse(val); } catch { val = {}; } }
  const slides = Array.isArray(val?.slides) ? val.slides : [];
  const bannerIds = slides.map((s) => String(s?.imageMediaId ?? "").trim()).filter(Boolean);
  const bannerExisting = bannerIds.length
    ? await sql`SELECT count(*)::int AS c FROM medias WHERE id IN ${sql(bannerIds)}`
    : [{ c: 0 }];

  const [{ referenced }] = await sql`
    SELECT count(DISTINCT m.id)::int AS referenced FROM medias m WHERE
      EXISTS (SELECT 1 FROM products p WHERE p.featured_image_id = m.id)
      OR EXISTS (SELECT 1 FROM product_medias pm WHERE pm."mediaId" = m.id)
      OR EXISTS (SELECT 1 FROM collections c WHERE c.featured_image_id = m.id)
      OR EXISTS (SELECT 1 FROM testimonials t WHERE t.featured_image_id = m.id)
      OR EXISTS (SELECT 1 FROM order_lines ol WHERE ol.product_image_key_snapshot = m.key)`;

  console.log("=== MEDIA KEEP BREAKDOWN (counts may overlap across sources) ===");
  console.log("total media:", total);
  console.log("product featured image:", c);
  console.log("product gallery image:", g);
  console.log("category (collection) image:", cat);
  console.log("testimonial image:", tst);
  console.log("order history image:", oh);
  console.log("banner image (in home_banner_slides, existing in medias):", bannerExisting[0].c, "of", bannerIds.length, "configured");
  console.log("--- unique referenced (kept):", referenced);
} catch (e) {
  console.log("ERR", e.message);
} finally {
  await sql.end();
}
