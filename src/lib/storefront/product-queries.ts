import type {
  FeaturedProductsQueryQuery,
  FeaturedProductsQueryQueryVariables,
  SearchQuery,
  SearchQueryVariables,
} from "@/gql/graphql";
import type { StorefrontProductSearchVariables } from "@/lib/storefront/search-params";
import { getClient } from "@/lib/urql";
import { CACHE_TAGS } from "@/lib/cache/constants";
import { withStorefrontCache } from "@/lib/cache/storefront-cache";
import {
  CATALOG_CACHE_SECONDS,
  canServeFromCatalogMirror,
  fetchCatalogFeaturedProducts,
  fetchCatalogProductSearch,
  isCatalogD1Enabled,
  isOffsetCursor,
} from "@/lib/catalog/d1-mirror";
import { isControlFlowError } from "@/lib/resilience";
import { filterDraftProductsFromCollection } from "./filter-draft-products";
import { findMatchingCollections } from "./collection-search";
import { fetchProductsByEffectivePriceRange } from "./product-price-search";
import {
  NO_COLLECTION_MATCH_ID,
  normalizeStorefrontSearchTerm,
  type StorefrontCollectionMatch,
} from "./search-utils";
import {
  FeaturedProductsQueryDocument,
  SearchInCollectionQueryDocument,
  SearchQueryDocument,
} from "./documents";

function stableKey(parts: Record<string, unknown>) {
  return JSON.stringify(parts);
}

export type StorefrontProductSearchResult = {
  productsCollection: SearchQuery["productsCollection"] | null;
  matchingCollections: StorefrontCollectionMatch[];
};

/**
 * Served when a D1 offset cursor reaches the GraphQL path (mirror went down
 * mid-scroll): pg_graphql cannot resume it, so end the list instead of erroring.
 */
const END_OF_RESULTS = {
  edges: [],
  pageInfo: { hasNextPage: false, endCursor: null },
};

function logMirrorFallback(label: string, error: unknown) {
  if (isControlFlowError(error)) throw error;
  console.warn(
    `[catalog-d1] ${label} fell back to Supabase:`,
    error instanceof Error ? error.message : error,
  );
}

function pickSearchDocument(variables: StorefrontProductSearchVariables) {
  const hasCollection = Boolean(variables.collections?.length);

  if (hasCollection) {
    return SearchInCollectionQueryDocument;
  }
  return SearchQueryDocument;
}

export async function fetchProductSearchCached(
  variables: StorefrontProductSearchVariables,
): Promise<StorefrontProductSearchResult> {
  if (isCatalogD1Enabled() && canServeFromCatalogMirror(variables.after)) {
    try {
      const mirrored = await withStorefrontCache(
        `sf:products:d1:search:${stableKey(variables)}`,
        () => fetchCatalogProductSearch(variables),
        {
          revalidate: CATALOG_CACHE_SECONDS,
          tags: [CACHE_TAGS.products, CACHE_TAGS.drafts],
          retry: false,
        },
      );
      return {
        productsCollection: await filterDraftProductsFromCollection(
          mirrored.productsCollection,
        ),
        matchingCollections: mirrored.matchingCollections,
      };
    } catch (error) {
      logMirrorFallback("search", error);
    }
  }

  const searchTerm = normalizeStorefrontSearchTerm(variables.search);
  const matchingCollections = searchTerm
    ? await findMatchingCollections(searchTerm)
    : [];

  const matchedCollectionIds =
    matchingCollections.length > 0
      ? matchingCollections.map((collection) => collection.id)
      : [NO_COLLECTION_MATCH_ID];

  const queryVariables: StorefrontProductSearchVariables = {
    ...variables,
    matchedCollectionIds,
  };

  const hasPrice = Boolean(queryVariables.lower && queryVariables.upper);

  const cacheKey = `sf:products:search:${stableKey({
    ...queryVariables,
    matchingCollectionIds: matchingCollections.map(
      (collection) => collection.id,
    ),
    engine: hasPrice ? "sql-effective-price" : "graphql",
  })}`;

  const productsCollection = await withStorefrontCache(
    cacheKey,
    async () => {
      if (hasPrice) {
        return fetchProductsByEffectivePriceRange(queryVariables);
      }
      if (isOffsetCursor(queryVariables.after)) return END_OF_RESULTS;

      const document = pickSearchDocument(queryVariables);
      const { data, error } = await getClient().query<SearchQuery>(
        document,
        queryVariables as SearchQueryVariables,
      );
      if (error) throw error;
      return data?.productsCollection ?? null;
    },
    { tags: [CACHE_TAGS.products, CACHE_TAGS.drafts] },
  );

  return {
    productsCollection:
      await filterDraftProductsFromCollection(productsCollection),
    matchingCollections: searchTerm ? matchingCollections : [],
  };
}

export async function fetchFeaturedProductsCached(variables: {
  first: number;
  after?: string | null;
}) {
  if (isCatalogD1Enabled() && canServeFromCatalogMirror(variables.after)) {
    try {
      const mirrored = await withStorefrontCache(
        `sf:products:d1:featured:${stableKey(variables)}`,
        () => fetchCatalogFeaturedProducts(variables),
        {
          revalidate: CATALOG_CACHE_SECONDS,
          tags: [CACHE_TAGS.products, CACHE_TAGS.drafts],
          retry: false,
        },
      );
      return filterDraftProductsFromCollection(mirrored);
    } catch (error) {
      logMirrorFallback("featured", error);
    }
  }

  const cacheKey = `sf:products:featured:${stableKey(variables)}`;

  const productsCollection = await withStorefrontCache(
    cacheKey,
    async () => {
      if (isOffsetCursor(variables.after)) return END_OF_RESULTS;
      const { data, error } = await getClient().query<
        FeaturedProductsQueryQuery,
        FeaturedProductsQueryQueryVariables
      >(FeaturedProductsQueryDocument, variables);
      if (error) throw error;
      return data?.productsCollection ?? null;
    },
    { tags: [CACHE_TAGS.products, CACHE_TAGS.drafts] },
  );

  return filterDraftProductsFromCollection(productsCollection);
}
