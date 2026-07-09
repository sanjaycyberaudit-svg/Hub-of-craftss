import db from "@/lib/supabase/db";
import { collections, products } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";

export async function getPublishedProductSlugs() {
  const rows = await db
    .select({
      slug: products.slug,
      createdAt: products.createdAt,
    })
    .from(products)
    .where(eq(products.isDraft, false))
    .orderBy(products.createdAt);

  return rows;
}

export async function getCollectionSlugs() {
  const rows = await db
    .select({
      slug: collections.slug,
      label: collections.label,
    })
    .from(collections)
    .orderBy(collections.order);

  return rows;
}
