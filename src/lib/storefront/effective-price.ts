import { products } from "@/lib/supabase/schema";
import { sql, type SQL } from "drizzle-orm";

/** SQL expression for checkout/sale price (matches shop-by-price buckets). */
export const effectivePriceSql = sql<number>`CASE
  WHEN ${products.discountEnabled} = true
    AND ${products.discountPercent} BETWEEN 1 AND 99
  THEN ROUND((${products.price} * (1 - ${products.discountPercent}::numeric / 100))::numeric, 2)
  ELSE ${products.price}::numeric
END`;

export function effectivePriceInRangeFilter(
  min: number,
  max: number,
): SQL | undefined {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    return undefined;
  }

  // Round to whole rupees so fractional discounted prices (e.g. ₹799.80)
  // match the same bucket the homepage tile shows.
  return sql`ROUND(${effectivePriceSql}) >= ${min} AND ROUND(${effectivePriceSql}) <= ${max}`;
}

export function parsePaginationOffset(after?: string | null): number {
  if (!after) return 0;
  const parsed = Number.parseInt(after, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
