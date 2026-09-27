import { ProductCardFragment } from "@/features/products/components/ProductCard";
import type {
  FeaturedRecommendationsQueryQuery,
  FeaturedRecommendationsQueryQueryVariables,
  RecomendationProductsQueryQuery,
} from "@/gql/graphql";
import { FeaturedRecommendationsQueryDocument } from "./documents";
import { gql } from "@/gql";
import { CACHE_TAGS } from "@/lib/cache/constants";
import { withStorefrontCache } from "@/lib/cache/storefront-cache";
import { filterDraftProductsFromCollection } from "@/lib/storefront/filter-draft-products";
import { getClient } from "@/lib/urql";

const RecommendationProductsQuery = gql(/* GraphQL */ `
  query RecomendationProductsQuery($first: Int!) {
    recommendations: productsCollection(first: $first) {
      edges {
        node {
          id
          ...ProductCardFragment
        }
      }
    }
  }
`);

/** Newest featured products for the product page strip; one entry shared by every product page. */
export async function getFeaturedRecommendationsCached(first = 4) {
  const data = await withStorefrontCache(
    `sf:recommendations:featured:${first}`,
    async () => {
      const { data, error } = await getClient().query<
        FeaturedRecommendationsQueryQuery,
        FeaturedRecommendationsQueryQueryVariables
      >(FeaturedRecommendationsQueryDocument, { first });
      if (error) throw error;
      return data ?? null;
    },
    { tags: [CACHE_TAGS.products, CACHE_TAGS.drafts] },
  );

  if (!data?.recommendations) return null;
  return filterDraftProductsFromCollection(data.recommendations);
}

export async function getRecommendationProductsCached(first = 4) {
  const data = await withStorefrontCache(
    `sf:recommendations:${first}`,
    async () => {
      const { data, error } = await getClient().query(
        RecommendationProductsQuery,
        { first },
      );
      if (error) {
        console.error("[recommendations] query failed:", error.message);
        return null;
      }
      return data as RecomendationProductsQueryQuery | null;
    },
    { tags: [CACHE_TAGS.products, CACHE_TAGS.drafts] },
  );

  if (!data?.recommendations) return data;

  const filtered = await filterDraftProductsFromCollection(
    data.recommendations,
  );
  return {
    ...data,
    recommendations: filtered,
  };
}
