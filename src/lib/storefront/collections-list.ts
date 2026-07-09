import { CollectionCardFragment } from "@/features/collections";
import type { AllCollectionsQueryQuery } from "@/gql/graphql";
import { gql } from "@/gql";
import { CACHE_TAGS } from "@/lib/cache/constants";
import { withStorefrontCache } from "@/lib/cache/storefront-cache";
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
