import { CollectionCardFragment } from "@/features/collections";
import { HomeFeaturedProductFragment } from "@/features/storefront/components";
import { TestimonialCardFragment } from "@/features/testimonials";
import type { LandingRouteQueryQuery } from "@/gql/graphql";
import { gql } from "@/gql";
import { CACHE_TAGS } from "@/lib/cache/constants";
import { withStorefrontCache } from "@/lib/cache/storefront-cache";
import { withFallback } from "@/lib/resilience";
import { filterDraftProductsFromCollection } from "@/lib/storefront/filter-draft-products";
import { getClient } from "@/lib/urql";

const LandingRouteQuery = gql(/* GraphQL */ `
  query LandingRouteQuery {
    products: productsCollection(
      filter: { featured: { eq: true } }
      first: 12
      orderBy: [{ created_at: DescNullsLast }]
    ) {
      edges {
        node {
          id
          ...HomeFeaturedProductFragment
        }
      }
    }

    collectionScrollCards: collectionsCollection(
      first: 8
      orderBy: [{ order: DescNullsLast }, { label: AscNullsLast }]
    ) {
      edges {
        node {
          id
          ...CollectionCardFragment
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }

    homeTestimonials: testimonialsCollection(
      filter: { is_published: { eq: true } }
      first: 12
      orderBy: [{ order: DescNullsLast }, { created_at: DescNullsLast }]
    ) {
      edges {
        node {
          id
          ...TestimonialCardFragment
        }
      }
    }
  }
`);

export async function getLandingPageDataCached(): Promise<LandingRouteQueryQuery | null> {
  // Throwing (rather than returning null) lets the cache retry the query and
  // fall back to the last good landing payload; the page supplies the final
  // null fallback if every layer fails.
  const data = await withFallback<LandingRouteQueryQuery | null>(
    "landing",
    () =>
      withStorefrontCache(
        "sf:landing:v2",
        async () => {
          const { data, error } = await getClient().query(
            LandingRouteQuery,
            {},
          );
          if (error) throw error;
          return data ?? null;
        },
        {
          revalidate: 300,
          tags: [
            CACHE_TAGS.products,
            CACHE_TAGS.collections,
            CACHE_TAGS.drafts,
          ],
        },
      ),
    null,
    { attempts: 1 },
  );

  if (!data?.products) return data;

  const filteredProducts = await filterDraftProductsFromCollection(
    data.products,
  );
  return {
    ...data,
    products: filteredProducts,
  };
}
