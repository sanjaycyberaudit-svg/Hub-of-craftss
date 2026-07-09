import { CollectionCardFragment } from "@/features/collections";
import { HomeFeaturedProductFragment } from "@/features/storefront/components";
import { TestimonialCardFragment } from "@/features/testimonials";
import type { LandingRouteQueryQuery } from "@/gql/graphql";
import { gql } from "@/gql";
import { CACHE_TAGS } from "@/lib/cache/constants";
import { withStorefrontCache } from "@/lib/cache/storefront-cache";
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
      first: 10
      orderBy: [{ order: DescNullsLast }]
    ) {
      edges {
        node {
          id
          ...CollectionCardFragment
        }
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
  const data = await withStorefrontCache(
    "sf:landing",
    async () => {
      const { data, error } = await getClient().query(LandingRouteQuery, {});
      if (error) {
        console.error("[landing] query failed:", error.message);
        return null;
      }
      return data ?? null;
    },
    {
      revalidate: 300,
      tags: [CACHE_TAGS.products, CACHE_TAGS.collections, CACHE_TAGS.drafts],
    },
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
