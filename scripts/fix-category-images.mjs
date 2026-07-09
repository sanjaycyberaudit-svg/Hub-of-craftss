/**
 * Fix collection + product images — real Tamil Nadu pattu saree model photos.
 * Usage: node scripts/fix-category-images.mjs
 */
import { createId } from "@paralleldrive/cuid2";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const SAKTHI_MEDIA_BASE =
  "https://qhtwwyqlsnckorndmhmt.supabase.co/storage/v1/object/public/media/sakthi/";

const SAREE_SHOP_MODEL_IMAGES = [
  `${SAKTHI_MEDIA_BASE}saree-R-tapgdDCDppiSQlGdkRl.webp`,
  `${SAKTHI_MEDIA_BASE}saree-pdIkXPnfznIDPsDJ4k4PE.webp`,
  `${SAKTHI_MEDIA_BASE}saree-U0Rtn9BZSywuxw19vrXla.webp`,
  `${SAKTHI_MEDIA_BASE}saree-N2Osq4mnOsiSNYN62fSbu.webp`,
  `${SAKTHI_MEDIA_BASE}upload-yMQI_X4Up0VTMyFXk9ZU7.webp`,
  `${SAKTHI_MEDIA_BASE}upload-RzPrdVNd6zAdsxUqjC0WD.webp`,
  `${SAKTHI_MEDIA_BASE}upload-TYcLFtrenilsOJUUynu8U.webp`,
  `${SAKTHI_MEDIA_BASE}upload-jYVtTkgJ_e2FyiDDUc9Jg.webp`,
];

const COLLECTION_IMAGE_BY_LABEL = {
  "Softie Sarees": SAREE_SHOP_MODEL_IMAGES[3],
  "Kanjivaram Wedding Sarees": SAREE_SHOP_MODEL_IMAGES[0],
  "Soft Silk Sarees": SAREE_SHOP_MODEL_IMAGES[3],
  "Banaras Tissue Silk Sarees": SAREE_SHOP_MODEL_IMAGES[5],
  "Traditional Silk Sarees": SAREE_SHOP_MODEL_IMAGES[0],
  "Kubera Pattu Sarees": SAREE_SHOP_MODEL_IMAGES[2],
  "Wedding Collections": SAREE_SHOP_MODEL_IMAGES[2],
  "Cotton Sarees": SAREE_SHOP_MODEL_IMAGES[1],
  "Silk Cotton Sarees": SAREE_SHOP_MODEL_IMAGES[1],
  "Fancy Silk Sarees": SAREE_SHOP_MODEL_IMAGES[4],
  "Mysore Silk": SAREE_SHOP_MODEL_IMAGES[6],
  "Space Silk Saree": SAREE_SHOP_MODEL_IMAGES[5],
  "Fancy Sarees": SAREE_SHOP_MODEL_IMAGES[7],
  "Celebrity Inspired Saree": SAREE_SHOP_MODEL_IMAGES[4],
};

function collectionImageForLabel(label, index) {
  return (
    COLLECTION_IMAGE_BY_LABEL[label] ??
    SAREE_SHOP_MODEL_IMAGES[index % SAREE_SHOP_MODEL_IMAGES.length]
  );
}

function isStaleImageKey(key) {
  if (!key) return true;
  if (key.startsWith("http://") || key.startsWith("https://")) {
    return (
      key.includes("unsplash.com") ||
      key.includes("images.pexels.com") ||
      key.includes("placehold.co")
    );
  }
  return (
    key.startsWith("public/bathroom-planning") ||
    key.startsWith("public/kitchen-planning") ||
    key.startsWith("public/living-room-planning") ||
    key.startsWith("public/bedroom-planning")
  );
}

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) throw new Error("Missing .env.local");
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const sb = createClient(
    `https://${env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}.supabase.co`,
    env.DATABASE_SERVICE_ROLE,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: collections, error: colErr } = await sb
    .from("collections")
    .select("id,label,featured_image_id")
    .order("order", { ascending: true });
  if (colErr) throw colErr;

  const sareeMedias = [];

  for (let i = 0; i < collections.length; i++) {
    const col = collections[i];
    const url = collectionImageForLabel(col.label, i);
    const alt = `${col.label} — Tamil Nadu saree model, SRI SAI RAGHAVENDRA TEX`;

    let mediaId = col.featured_image_id;

    const { data: currentMedia } = mediaId
      ? await sb.from("medias").select("key").eq("id", mediaId).maybeSingle()
      : { data: null };

    const needsReplace = !mediaId || isStaleImageKey(currentMedia?.key) || currentMedia?.key !== url;

    if (mediaId && needsReplace) {
      await sb.from("medias").update({ key: url, alt }).eq("id", mediaId);
    } else if (!mediaId) {
      const { data: media, error } = await sb
        .from("medias")
        .insert({ key: url, alt })
        .select("id,key")
        .single();
      if (error) throw error;
      mediaId = media.id;
      await sb
        .from("collections")
        .update({ featured_image_id: mediaId })
        .eq("id", col.id);
    }

    sareeMedias.push({ id: mediaId, key: url, alt });
    console.log(`Collection: ${col.label}`);
  }

  const { data: products, error: prodErr } = await sb
    .from("products")
    .select("id,name,featured_image_id")
    .order("name");
  if (prodErr) throw prodErr;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const src = sareeMedias[i % sareeMedias.length] ?? sareeMedias[0];
    let mediaId = product.featured_image_id;

    const { data: currentMedia } = mediaId
      ? await sb.from("medias").select("key").eq("id", mediaId).maybeSingle()
      : { data: null };

    const needsReplace = !mediaId || isStaleImageKey(currentMedia?.key);

    if (needsReplace) {
      if (mediaId && currentMedia) {
        await sb
          .from("medias")
          .update({ key: src.key, alt: `${product.name} — saree model` })
          .eq("id", mediaId);
      } else {
        const newId = createId();
        const { error } = await sb.from("medias").insert({
          id: newId,
          key: src.key,
          alt: `${product.name} — saree model`,
        });
        if (error) throw error;
        mediaId = newId;
      }
    }

    await sb
      .from("products")
      .update({ featured_image_id: mediaId, images: [src.key] })
      .eq("id", product.id);

    await sb.from("product_medias").delete().eq("product_id", product.id);
    await sb.from("product_medias").insert({
      product_id: product.id,
      media_id: mediaId,
      priority: 0,
    });

    console.log(`Product: ${product.name}`);
  }

  const { data: stale } = await sb
    .from("medias")
    .select("id,key")
    .or(
      "key.like.public/bathroom-planning%,key.like.public/kitchen-planning%,key.like.public/living-room-planning%,key.like.public/bedroom-planning%,key.like.%unsplash.com%,key.like.%images.pexels.com%",
    );

  for (const row of stale ?? []) {
    const { count } = await sb
      .from("collections")
      .select("id", { count: "exact", head: true })
      .eq("featured_image_id", row.id);
    const { count: pCount } = await sb
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("featured_image_id", row.id);
    if ((count ?? 0) === 0 && (pCount ?? 0) === 0) {
      await sb.from("medias").delete().eq("id", row.id);
      console.log(`Removed stale media: ${row.key}`);
    }
  }

  console.log("\nDone. Refresh https://ssr-tex-shop.vercel.app (Ctrl+Shift+R).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
