import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

const BUCKET = "media";
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.DATABASE_SERVICE_ROLE,
  { auth: { persistSession: false } },
);

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

try {
  // Banner ids (protected) from api_settings JSON string.
  const bs = await sql`SELECT value FROM api_settings WHERE key='home_banner_slides' LIMIT 1`;
  let val = bs[0]?.value;
  if (typeof val === "string") { try { val = JSON.parse(val); } catch { val = {}; } }
  const slides = Array.isArray(val?.slides) ? val.slides : [];
  const bannerIds = slides.map((s) => String(s?.imageMediaId ?? "").trim()).filter(Boolean);

  // Orphans = not referenced anywhere; then exclude banners.
  const orphansRaw = await sql`
    SELECT m.id, m.key, m.alt, m.created_at FROM medias m WHERE
      NOT EXISTS (SELECT 1 FROM products p WHERE p.featured_image_id = m.id)
      AND NOT EXISTS (SELECT 1 FROM product_medias pm WHERE pm."mediaId" = m.id)
      AND NOT EXISTS (SELECT 1 FROM collections c WHERE c.featured_image_id = m.id)
      AND NOT EXISTS (SELECT 1 FROM testimonials t WHERE t.featured_image_id = m.id)
      AND NOT EXISTS (SELECT 1 FROM order_lines ol WHERE ol.product_image_key_snapshot = m.key)
    ORDER BY m.created_at`;
  const bannerSet = new Set(bannerIds);
  const orphans = orphansRaw.filter((o) => !bannerSet.has(o.id));

  console.log("orphans to delete:", orphans.length, "(banner protected:", orphansRaw.length - orphans.length, ")");

  // 1) Backup before deleting.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `scripts/deleted-media-backup-${stamp}.json`;
  writeFileSync(backupPath, JSON.stringify(orphans, null, 2));
  console.log("backup written:", backupPath);

  // 2) Delete in-project storage files (relative keys only; skip external URLs).
  const storageKeys = orphans
    .map((o) => o.key)
    .filter((k) => k && !/^https?:\/\//i.test(k));
  console.log("in-project storage files to remove:", storageKeys.length);
  console.log("external-URL rows (DB row only):", orphans.length - storageKeys.length);

  let removedFiles = 0;
  for (const batch of chunk(storageKeys, 100)) {
    const { data, error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) console.log("  storage remove error:", error.message);
    else removedFiles += data?.length ?? 0;
  }
  console.log("storage files removed:", removedFiles);

  // 3) Delete DB rows.
  const ids = orphans.map((o) => o.id);
  let deletedRows = 0;
  for (const batch of chunk(ids, 500)) {
    const res = await sql`DELETE FROM medias WHERE id IN ${sql(batch)}`;
    deletedRows += res.count;
  }
  console.log("DB media rows deleted:", deletedRows);

  const [{ remaining }] = await sql`SELECT count(*)::int AS remaining FROM medias`;
  console.log("media rows remaining:", remaining);
} catch (e) {
  console.log("ERR", e.message);
} finally {
  await sql.end();
}
