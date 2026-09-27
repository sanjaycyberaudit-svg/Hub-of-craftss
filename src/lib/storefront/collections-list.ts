import "server-only";

import { CollectionCardFragment } from "@/features/collections/components/CollectionsCard";
import type { AllCollectionsQueryQuery } from "@/gql/graphql";
import { gql } from "@/gql";
import { CACHE_TAGS } from "@/lib/cache/constants";
import { withStorefrontCache } from "@/lib/cache/storefront-cache";
import {
  CATALOG_CACHE_SECONDS,
  fetchCatalogCollections,
  isCatalogD1Enabled,
} from "@/lib/catalog/d1-mirror";
import { isControlFlowError } from "@/lib/resilience";
import { getClient } from "@/lib/urql";

const AllCollectionsQuery = gql(/* GraphQL */ `
  query AllCollectionsQuery {
    collectionsCollection(
      first: 50
      orderBy: [{ order: DescNullsLast }, { label: AscNullsLast }]
    ) {
      edges {
        node {
          id
          ...CollectionCardFragment
        }
      }
    }
  }
`);

export async function getAllCollectionsCached(): Promise<
  AllCollectionsQueryQuery["collectionsCollection"] | null
> {
  if (isCatalogD1Enabled()) {
    try {
      return await withStorefrontCache(
        "sf:collection:d1:all",
        fetchCatalogCollections,
        {
          revalidate: CATALOG_CACHE_SECONDS,
          tags: [CACHE_TAGS.collections],
          retry: false,
        },
      );
    } catch (error) {
      if (isControlFlowError(error)) throw error;
      console.warn(
        "[catalog-d1] collections fell back to Supabase:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return withStorefrontCache(
    "sf:collections:all",
    async () => {
      const { data, error } = await getClient().query(AllCollectionsQuery, {});
      if (error) {
        console.error("[collections] query failed:", error.message);
        return null;
      }
      return data?.collectionsCollection ?? null;
    },
    { revalidate: 300, tags: [CACHE_TAGS.collections] },
  );
}

// Keep fragment document referenced for gql registration.
void CollectionCardFragment;
