import { revalidateTag } from "next/cache";
import { ADMIN_PRODUCTS_LIST_TAG } from "@/lib/admin/getAdminProductsList";
import { CACHE_TAGS } from "./constants";
import { redisDelByPrefix } from "./redis";

const REDIS_PREFIXES = [
  "sf:products:",
  "sf:drafts",
  "sf:size:",
  "sf:collection:",
  "sf:product:",
  "sf:landing",
  "sf:recommendations:",
  "sf:shop-by-price",
] as const;

/** Bust admin products table cache after catalog writes. */
export function invalidateAdminProductsCache() {
  revalidateTag(ADMIN_PRODUCTS_LIST_TAG);
  // Admin products load live from DB; tag kept for future ISR if reintroduced.
}

/** Bust storefront read caches after admin/catalog writes. */
export async function invalidateStorefrontCache() {
  invalidateAdminProductsCache();
  Object.values(CACHE_TAGS).forEach((tag) => revalidateTag(tag));

  await Promise.all(REDIS_PREFIXES.map((prefix) => redisDelByPrefix(prefix)));
}
