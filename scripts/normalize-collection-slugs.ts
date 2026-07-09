import db from "@/lib/supabase/db";
import { collections } from "@/lib/supabase/schema";
import { slugify } from "@/lib/utils";
import { eq } from "drizzle-orm";

async function main() {
  const rows = await db.select().from(collections);

  for (const row of rows) {
    const fromLabel = slugify(row.label);
    const fromSlug = slugify(row.slug);
    const slugNeedsFix =
      /\s/.test(row.slug) ||
      row.slug !== row.slug.toLowerCase() ||
      row.slug !== fromSlug;
    const normalized = slugNeedsFix
      ? fromLabel || fromSlug
      : fromSlug || fromLabel;
    if (!normalized || normalized === row.slug) continue;

    await db
      .update(collections)
      .set({ slug: normalized })
      .where(eq(collections.id, row.id));

    console.log(`Updated: ${row.label} | ${row.slug} -> ${normalized}`);
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
