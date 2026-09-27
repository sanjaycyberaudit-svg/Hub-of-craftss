import type {
  ProductDetailPageQueryQuery,
  ProductDetailPageQueryQueryVariables,
} from "@/gql/graphql";
import { cache } from "react";
import { getClient } from "@/lib/urql";
import { CACHE_TAGS, productDetailCacheTag } from "@/lib/cache/constants";
import { withStorefrontCache } from "@/lib/cache/storefront-cache";
import { isProductSlugPublished } from "@/lib/storefront/product-visibility";
import { ProductDetailPageQueryDocument } from "./documents";

async function isProductSlugPublishedCached(slug: string): Promise<boolean> {
  return withStorefrontCache(
    `sf:published:${slug}`,
    () => isProductSlugPublished(slug),
    {
      revalidate: 60,
      tags: [productDetailCacheTag(slug), CACHE_TAGS.productDetails],
    },
  );
}

/**
 * Holds only this product's data, so a write to one product clears one entry.
 * The recommendations strip is shared: see getFeaturedRecommendationsCached.
 */
export async function getProductDetailCached(productSlug: string) {
  return withStorefrontCache(
    `sf:product:${productSlug}`,
    async () => {
      const { data, error } = await getClient().query<
        ProductDetailPageQueryQuery,
        ProductDetailPageQueryQueryVariables
      >(ProductDetailPageQueryDocument, { productSlug });
      if (error) throw error;
      return data;
    },
    { tags: [productDetailCacheTag(productSlug), CACHE_TAGS.productDetails] },
  );
}

/** Returns null when the slug is draft or missing. */
export const getPublishedProductDetailCached = cache(
  async (productSlug: string) => {
    const published = await isProductSlugPublishedCached(productSlug);
    if (!published) return null;
    return getProductDetailCached(productSlug);
  },
);
