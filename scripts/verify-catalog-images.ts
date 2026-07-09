import { asc, eq } from "drizzle-orm";
import db from "../src/lib/supabase/db";
import * as schema from "../src/lib/supabase/schema";
import { keytoUrl, supabaseStoragePublicUrl } from "../src/lib/utils";

async function main() {
  const collections = await db
    .select({
      label: schema.collections.label,
      key: schema.medias.key,
    })
    .from(schema.collections)
    .innerJoin(
      schema.medias,
      eq(schema.collections.featuredImageId, schema.medias.id),
    )
    .orderBy(asc(schema.collections.order));

  const products = await db
    .select({
      name: schema.products.name,
      slug: schema.products.slug,
      featured: schema.products.featured,
      key: schema.medias.key,
    })
    .from(schema.products)
    .innerJoin(
      schema.medias,
      eq(schema.products.featuredImageId, schema.medias.id),
    )
    .orderBy(asc(schema.products.name));

  const featured = products.filter((p) => p.featured);

  console.log("=== Collections (%d) ===", collections.length);
  for (const c of collections) {
    const ok = c.key.startsWith("sakthi/");
    console.log(ok ? "OK" : "OLD", c.label, "→", c.key);
  }

  console.log("\n=== All products (%d) ===", products.length);
  for (const p of products) {
    const ok = p.key.startsWith("sakthi/");
    console.log(
      ok ? "OK" : "OLD",
      p.featured ? "[featured]" : "",
      p.name,
      "→",
      p.key,
    );
  }

  console.log("\n=== Featured products (%d) ===", featured.length);
  for (const p of featured) {
    console.log(" ", p.name, keytoUrl(p.key));
  }

  const sample = collections[0]?.key;
  if (sample?.startsWith("sakthi/")) {
    console.log("\nSample URL:", supabaseStoragePublicUrl(sample));
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
