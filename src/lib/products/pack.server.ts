import "server-only";

import db from "@/lib/supabase/db";
import { products } from "@/lib/supabase/schema";
import { inArray } from "drizzle-orm";
import type { ProductPackFields } from "@/lib/products/pack";

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
