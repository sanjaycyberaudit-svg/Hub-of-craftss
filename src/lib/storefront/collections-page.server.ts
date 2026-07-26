import "server-only";

import {
  CollectionsPageQuery,
  HOME_CATEGORIES_PAGE_SIZE,
  type HomeCategoriesPage,
} from "@/lib/storefront/collections-page";
import { getClient } from "@/lib/urql";

export async function fetchCollectionsPage(params: {
  first?: number;
  after?: string | null;
}): Promise<HomeCategoriesPage> {
  const first = Math.min(
    Math.max(Number(params.first) || HOME_CATEGORIES_PAGE_SIZE, 1),
    24,
  );
  const after = params.after?.trim() || null;

  const { data, error } = await getClient().query(CollectionsPageQuery, {
    first,
    after,
  });

  if (error) {
    throw new Error(error.message || "Could not load categories.");
  }

  const collection = data?.collectionsCollection;
  return {
    edges: collection?.edges ?? [],
    pageInfo: {
      hasNextPage: Boolean(collection?.pageInfo?.hasNextPage),
      endCursor: collection?.pageInfo?.endCursor ?? null,
    },
  };
}
