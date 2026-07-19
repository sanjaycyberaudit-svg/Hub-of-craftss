import db from "@/lib/supabase/db";
import { products } from "@/lib/supabase/schema";
import { inArray } from "drizzle-orm";

export type ProductPackFields = {
  soldAsPack?: boolean | null;
  packSize?: number | null;
};

/** True when product is sold as a labeled set/pack with a valid size. */
export function isProductSoldAsPack(
  product: ProductPackFields | null | undefined,
): boolean {
  if (!product?.soldAsPack) return false;
  const size = Number(product.packSize);
  return Number.isInteger(size) && size >= 2 && size <= 9999;
}

export function getProductPackSize(
  product: ProductPackFields | null | undefined,
): number | null {
  if (!isProductSoldAsPack(product)) return null;
  return Number(product.packSize);
}

/** Storefront label e.g. "Set of 50". */
export function formatProductPackLabel(
  product: ProductPackFields | null | undefined,
): string | null {
  const size = getProductPackSize(product);
  if (size == null) return null;
  return `Set of ${size}`;
}

/** Load pack fields by product id (Drizzle — avoids GraphQL schema lag). */
export async function getProductPackFieldsByIds(
  productIds: string[],
): Promise<Map<string, ProductPackFields>> {
  const ids = [...new Set(productIds.map((id) => id.trim()).filter(Boolean))];
  const map = new Map<string, ProductPackFields>();
  if (ids.length === 0) return map;

  const rows = await db
    .select({
      id: products.id,
      soldAsPack: products.soldAsPack,
      packSize: products.packSize,
    })
    .from(products)
    .where(inArray(products.id, ids));

  for (const row of rows) {
    map.set(row.id, {
      soldAsPack: row.soldAsPack,
      packSize: row.packSize,
    });
  }
  return map;
}
