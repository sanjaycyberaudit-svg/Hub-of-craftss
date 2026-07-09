import type { CollectionRouteQueryQuery } from "@/gql/graphql";
import { getClient } from "@/lib/urql";
import { CACHE_TAGS } from "@/lib/cache/constants";
import { withStorefrontCache } from "@/lib/cache/storefront-cache";
import { CollectionRouteQueryDocument } from "./documents";
import { buildCollectionLookup } from "./collection-lookup";

async function fetchCollectionByLookup(slugParam: string) {
  const lookup = buildCollectionLookup(slugParam);
  if (!lookup) return null;

  const { data, error } = await getClient().query(
    CollectionRouteQueryDocument,
    {
      exactSlug: lookup.exactSlug,
      slugified: lookup.slugified,
      labelPattern: lookup.labelPattern,
    },
  );

  if (error) throw error;
  return data;
}

export type CollectionPageData = CollectionRouteQueryQuery;

export async function getCollectionPageCached(slugParam: string) {
  const lookup = buildCollectionLookup(slugParam);
  if (!lookup) return null;

  const cacheKey = `sf:collection:${lookup.exactSlug}:${lookup.slugified}`;

  try {
    const data = await withStorefrontCache(
      cacheKey,
      () => fetchCollectionByLookup(slugParam),
      { tags: [CACHE_TAGS.collections, CACHE_TAGS.products] },
    );

    const collection = data?.collectionsCollection?.edges?.[0]?.node;
    if (!collection?.id) return null;

    return data;
  } catch (error) {
    console.error(
      `[storefront] collection load failed (${lookup.exactSlug}):`,
      error,
    );
    return null;
  }
}
