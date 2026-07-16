import type {
  ProductDetailPageQueryQuery,
  ProductDetailPageQueryQueryVariables,
} from "@/gql/graphql";
import { cache } from "react";
import { getClient } from "@/lib/urql";
import { CACHE_TAGS } from "@/lib/cache/constants";
import { withStorefrontCache } from "@/lib/cache/storefront-cache";
import {
  filterDraftEdges,
  getDraftProductIdSet,
} from "@/lib/storefront/filter-draft-products";
import { isProductSlugPublished } from "@/lib/storefront/product-visibility";
import { ProductDetailPageQueryDocument } from "./documents";

async function isProductSlugPublishedCached(slug: string): Promise<boolean> {
  return withStorefrontCache(
    `sf:published:${slug}`,
    () => isProductSlugPublished(slug),
    { revalidate: 60, tags: [CACHE_TAGS.products, CACHE_TAGS.drafts] },
  );
}

export async function getProductDetailCached(productSlug: string) {
  const data = await withStorefrontCache(
    `sf:product:${productSlug}`,
    async () => {
      const { data, error } = await getClient().query<
        ProductDetailPageQueryQuery,
        ProductDetailPageQueryQueryVariables
      >(ProductDetailPageQueryDocument, { productSlug });
      if (error) throw error;
      return data;
    },
    { tags: [CACHE_TAGS.products, CACHE_TAGS.drafts] },
  );

  if (!data?.recommendations?.edges?.length) return data;

  const draftIds = await getDraftProductIdSet();
  return {
    ...data,
    recommendations: filterDraftEdges(data.recommendations, draftIds),
  };
}

/** Returns null when the slug is draft or missing. */
export const getPublishedProductDetailCached = cache(
  async (productSlug: string) => {
    const published = await isProductSlugPublishedCached(productSlug);
    if (!published) return null;
    return getProductDetailCached(productSlug);
  },
);
