import "server-only";

import db from "@/lib/supabase/db";
import { products } from "@/lib/supabase/schema";
import { inArray } from "drizzle-orm";
import {
  formatProductPackLabel,
  type ProductPackFields,
} from "@/lib/products/pack";
import { withFallback, withRetry } from "@/lib/resilience";

/** Load pack fields by product id (Drizzle — avoids GraphQL schema lag). */
export async function getProductPackFieldsByIds(
  productIds: string[],
): Promise<Map<string, ProductPackFields>> {
  const ids = [...new Set(productIds.map((id) => id.trim()).filter(Boolean))];
  const map = new Map<string, ProductPackFields>();
  if (ids.length === 0) return map;

  const rows = await withRetry(
    () =>
      db
        .select({
          id: products.id,
          soldAsPack: products.soldAsPack,
          packSize: products.packSize,
        })
        .from(products)
        .where(inArray(products.id, ids)),
    { label: "pack-fields" },
  );

  for (const row of rows) {
    map.set(row.id, {
      soldAsPack: row.soldAsPack,
      packSize: row.packSize,
    });
  }
  return map;
}

/**
 * Batch “Set of N” labels keyed by product id (`null` when not a pack).
 * Labels are presentational, so a database blip drops the badge rather than
 * taking down the listing that renders it.
 */
export async function getProductPackLabelsByIds(
  productIds: string[],
): Promise<Record<string, string | null>> {
  const ids = [...new Set(productIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return {};

  const fieldsById = await withFallback(
    "pack-labels",
    () => getProductPackFieldsByIds(ids),
    new Map<string, ProductPackFields>(),
    { attempts: 1 },
  );

  const labels: Record<string, string | null> = {};
  for (const id of ids) {
    labels[id] = formatProductPackLabel(fieldsById.get(id));
  }
  return labels;
}
