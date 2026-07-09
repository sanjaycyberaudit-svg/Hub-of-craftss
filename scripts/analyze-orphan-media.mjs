import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

try {
  const [{ total }] = await sql`SELECT count(*)::int AS total FROM medias`;

  // Banner media ids come from api_settings home_banner_slides JSON.
  const bannerSetting = await sql`
    SELECT value FROM api_settings WHERE key = 'home_banner_slides' LIMIT 1
  `;
  let bannerIds = [];
  let val = bannerSetting[0]?.value;
  if (typeof val === "string") {
    try {
      val = JSON.parse(val);
    } catch {
      val = {};
    }
  }
  const slides = Array.isArray(val?.slides) ? val.slides : [];
  bannerIds = slides
    .map((s) => String(s?.imageMediaId ?? "").trim())
    .filter(Boolean);

  // Referenced media ids across all keep-sources.
  const referenced = await sql`
    SELECT id FROM medias m WHERE
      EXISTS (SELECT 1 FROM products p WHERE p.featured_image_id = m.id)
      OR EXISTS (SELECT 1 FROM product_medias pm WHERE pm."mediaId" = m.id)
      OR EXISTS (SELECT 1 FROM collections c WHERE c.featured_image_id = m.id)
      OR EXISTS (SELECT 1 FROM testimonials t WHERE t.featured_image_id = m.id)
      OR EXISTS (SELECT 1 FROM order_lines ol WHERE ol.product_image_key_snapshot = m.key)
  `;
  const referencedIds = new Set(referenced.map((r) => r.id));
  const bannerIdSet = new Set(bannerIds);

  // Orphan = not referenced anywhere AND not a banner image.
  const orphans = await sql`
    SELECT m.id, m.key, m.alt, m.created_at FROM medias m WHERE
      NOT EXISTS (SELECT 1 FROM products p WHERE p.featured_image_id = m.id)
      AND NOT EXISTS (SELECT 1 FROM product_medias pm WHERE pm."mediaId" = m.id)
      AND NOT EXISTS (SELECT 1 FROM collections c WHERE c.featured_image_id = m.id)
      AND NOT EXISTS (SELECT 1 FROM testimonials t WHERE t.featured_image_id = m.id)
      AND NOT EXISTS (SELECT 1 FROM order_lines ol WHERE ol.product_image_key_snapshot = m.key)
    ORDER BY m.created_at
  `;
  const orphanNonBanner = orphans.filter((o) => !bannerIdSet.has(o.id));
  const orphanButBanner = orphans.filter((o) => bannerIdSet.has(o.id));

  // Key-prefix breakdown of orphans (to spot banner-like keys).
  const prefixCounts = {};
  for (const o of orphanNonBanner) {
    const prefix = String(o.key).split("/")[0];
    prefixCounts[prefix] = (prefixCounts[prefix] ?? 0) + 1;
  }

  console.log("=== MEDIA ORPHAN DRY RUN (no deletes) ===");
  console.log("total medias:", total);
  console.log("referenced (kept):", referencedIds.size);
  console.log("banner slide ids (kept):", bannerIds.length);
  console.log("orphans total:", orphans.length);
  console.log("  - orphan but banner (KEPT):", orphanButBanner.length);
  console.log("  - orphan deletable (non-banner):", orphanNonBanner.length);
  console.log("orphan key prefixes:", JSON.stringify(prefixCounts, null, 2));
  console.log(
    "sample deletable:",
    JSON.stringify(
      orphanNonBanner.slice(0, 20).map((o) => ({ key: o.key, alt: o.alt })),
      null,
      2,
    ),
  );
} catch (e) {
  console.log("ERR", e.message);
} finally {
  await sql.end();
}
