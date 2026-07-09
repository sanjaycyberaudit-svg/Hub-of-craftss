import db from "@/lib/supabase/db";
import { products } from "@/lib/supabase/schema";
import { eq, inArray } from "drizzle-orm";

export { assertProductsArePublished } from "@/lib/storefront/product-visibility-policy";

/** Fresh DB read — not cached. Use before serving a product page or checkout. */
export async function isProductSlugPublished(slug: string): Promise<boolean> {
  const normalized = slug.trim();
  if (!normalized) return false;

  const [row] = await db
    .select({ isDraft: products.isDraft })
    .from(products)
    .where(eq(products.slug, normalized))
    .limit(1);

  if (!row) return false;
  return !row.isDraft;
}

/** Fresh DB read — not cached. Blocks checkout/cart for draft or missing products. */
export async function findUnpublishedProductIds(
  productIds: string[],
): Promise<string[]> {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const rows = await db
    .select({ id: products.id, isDraft: products.isDraft })
    .from(products)
    .where(inArray(products.id, uniqueIds));

  const rowById = new Map(rows.map((row) => [row.id, row]));
  return uniqueIds.filter((id) => {
    const row = rowById.get(id);
    return !row || row.isDraft;
  });
}
