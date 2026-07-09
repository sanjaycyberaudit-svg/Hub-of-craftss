import db from "@/lib/supabase/db";
import { collections, medias, products } from "@/lib/supabase/schema";
import { and, eq, isNotNull } from "drizzle-orm";

/** Published products assigned to an existing category (excludes drafts and uncategorized). */
export function categorizedPublishedProductConditions() {
  return and(eq(products.isDraft, false), isNotNull(products.collectionId));
}

export type CategorizedProductPriceRow = {
  id: string;
  price: string;
  discountEnabled: boolean;
  discountPercent: number | null;
  featured: boolean | null;
  mediaKey: string | null;
  mediaAlt: string | null;
};

/**
 * Load shop-visible categorized products for price grouping.
 * Matches the product cards shown on /shop price-range pages:
 * published, in an active category, with a featured image.
 */
export async function loadCategorizedProductsForPricing(): Promise<
  CategorizedProductPriceRow[]
> {
  return db
    .select({
      id: products.id,
      price: products.price,
      discountEnabled: products.discountEnabled,
      discountPercent: products.discountPercent,
      featured: products.featured,
      mediaKey: medias.key,
      mediaAlt: medias.alt,
    })
    .from(products)
    .innerJoin(collections, eq(products.collectionId, collections.id))
    .innerJoin(medias, eq(products.featuredImageId, medias.id))
    .where(categorizedPublishedProductConditions());
}
