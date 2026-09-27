import { revalidateTag } from "next/cache";
import { inArray } from "drizzle-orm";
import { ADMIN_PRODUCTS_LIST_TAG } from "@/lib/admin/getAdminProductsList";
import { scheduleCatalogMirrorSync } from "@/lib/catalog/d1-mirror";
import db from "@/lib/supabase/db";
import { products } from "@/lib/supabase/schema";
import {
  CACHE_TAGS,
  EDGE_CACHE_TAGS,
  productDetailCacheTag,
  productSizeCacheTag,
} from "./constants";
import { purgeEdgeCacheTags } from "./edge-cache";
import { clearStorefrontCacheEntries } from "./storefront-cache";
import {
  revalidateAllProductPages,
  revalidateAllStorefrontPages,
  revalidateProductListPages,
  revalidateProductPages,
} from "./storefront-pages";

/** Everything admin-owned; pincode lookups come from India Post, not admin. */
const ALL_STOREFRONT_PREFIXES = [
  "sf:products:",
  "sf:drafts",
  "sf:size:",
  "sf:collection:",
  "sf:collections:",
  "sf:product:",
  "sf:published:",
  "sf:runtime-bundle",
  "sf:home-banner",
  "sf:landing",
  "sf:recommendations:",
  "sf:shop-by-price",
] as const;

/** Entries that list several products, so any product write can change them. */
export const PRODUCT_LIST_PREFIXES = [
  "sf:products:",
  "sf:drafts",
  "sf:collection:",
  "sf:collections:",
  "sf:landing",
  "sf:recommendations:",
  "sf:shop-by-price",
] as const;

const PRODUCT_LIST_TAGS = [
  CACHE_TAGS.products,
  CACHE_TAGS.drafts,
  CACHE_TAGS.collections,
] as const;

/** Category changes also rename labels embedded in list cards. */
const COLLECTION_PREFIXES = [
  "sf:collection:",
  "sf:collections:",
  "sf:landing",
  "sf:products:",
] as const;

export type ProductCacheIdentity = {
  id: string;
  slug: string;
  featured: boolean | null;
};

export type ProductCacheScope = {
  productIds: readonly string[];
  /**
   * Rows read before the write. Needed for deletes (the row is gone after) and
   * for featured changes (the product may leave the recommendations strip).
   */
  previous?: readonly ProductCacheIdentity[];
  /** False when only product-page data changed (e.g. option prices/quantities). */
  lists?: boolean;
};

function logFailure(step: string, error: unknown) {
  console.warn(`[cache] ${step} failed:`, error);
}

/** Read before a delete or featured change so invalidation can still find the product. */
export async function loadProductCacheIdentities(
  productIds: readonly string[],
): Promise<ProductCacheIdentity[]> {
  const ids = [...new Set(productIds.filter(Boolean))];
  if (ids.length === 0) return [];
  try {
    return await db
      .select({
        id: products.id,
        slug: products.slug,
        featured: products.featured,
      })
      .from(products)
      .where(inArray(products.id, ids));
  } catch (error) {
    logFailure("product identity lookup", error);
    return [];
  }
}

/** Bust admin products table cache after catalog writes. */
export function invalidateAdminProductsCache() {
  revalidateTag(ADMIN_PRODUCTS_LIST_TAG);
  // Admin products load live from DB; tag kept for future ISR if reintroduced.
}

/**
 * Clears only what the given products can appear in: their own page, size and
 * published entries, plus shared product lists. Other products' pages,
 * settings and banners stay cached.
 */
export async function invalidateProductCaches(
  scope: ProductCacheScope,
): Promise<void> {
  const productIds = [...new Set(scope.productIds.filter(Boolean))];
  if (productIds.length === 0) return;
  const includeLists = scope.lists !== false;

  const current = await loadProductCacheIdentities(productIds);
  const identities = [...(scope.previous ?? []), ...current];
  const slugs = [...new Set(identities.map((row) => row.slug).filter(Boolean))];

  try {
    invalidateAdminProductsCache();
  } catch (error) {
    logFailure("admin tag revalidate", error);
  }

  try {
    await clearStorefrontCacheEntries({
      keys: [
        ...slugs.flatMap((slug) => [
          `sf:product:${slug}`,
          `sf:published:${slug}`,
        ]),
        ...productIds.map((id) => `sf:size:${id}`),
      ],
      prefixes: [
        "sf:size:batch:",
        ...(includeLists ? PRODUCT_LIST_PREFIXES : []),
      ],
    });
  } catch (error) {
    logFailure("product cache clear", error);
  }

  try {
    [
      ...slugs.map(productDetailCacheTag),
      ...productIds.map(productSizeCacheTag),
      CACHE_TAGS.sizeBatch,
      ...(includeLists ? PRODUCT_LIST_TAGS : []),
    ].forEach((tag) => revalidateTag(tag));
  } catch (error) {
    logFailure("product tag revalidate", error);
  }

  revalidateProductPages(slugs);
  if (includeLists) {
    revalidateProductListPages();
    // Every product page shows the newest featured products.
    if (identities.some((row) => row.featured)) revalidateAllProductPages();
  }

  await purgeEdgeCacheTags([
    ...productIds.map(EDGE_CACHE_TAGS.product),
    ...(includeLists ? [EDGE_CACHE_TAGS.lists] : []),
  ]);

  // The D1 mirror holds list-card fields only (no option config).
  if (includeLists) scheduleCatalogMirrorSync();
}

/** Full storefront bust, for settings and other changes that touch every page. */
export async function invalidateStorefrontCache() {
  try {
    invalidateAdminProductsCache();
  } catch (error) {
    logFailure("admin tag revalidate", error);
  }

  try {
    Object.values(CACHE_TAGS).forEach((tag) => revalidateTag(tag));
  } catch (error) {
    logFailure("storefront tag revalidate", error);
  }

  try {
    await clearStorefrontCacheEntries({ prefixes: ALL_STOREFRONT_PREFIXES });
  } catch (error) {
    logFailure("storefront cache clear", error);
  }

  revalidateAllStorefrontPages();
  await purgeEdgeCacheTags([EDGE_CACHE_TAGS.all]);
  scheduleCatalogMirrorSync();
}

/**
 * Category-only catalog changes: fewer Redis KEYS scans + less Fluid Active CPU
 * than a full storefront bust.
 */
export async function invalidateStorefrontCollectionsCache() {
  try {
    revalidateTag(CACHE_TAGS.collections);
    revalidateTag(CACHE_TAGS.products);
  } catch (error) {
    logFailure("collection tag revalidate", error);
  }

  try {
    await clearStorefrontCacheEntries({ prefixes: COLLECTION_PREFIXES });
  } catch (error) {
    logFailure("collection cache clear", error);
  }

  revalidateAllStorefrontPages();
  await purgeEdgeCacheTags([EDGE_CACHE_TAGS.lists]);
  scheduleCatalogMirrorSync();
}
