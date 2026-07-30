import { getDraftProductIdsSafe } from "@/lib/storefront/draft-product-ids";

type ProductEdge = {
  node: { id: string };
};

type ProductsCollection = {
  edges: ProductEdge[];
  pageInfo?: unknown;
} | null;

/** `null` means the draft list is unavailable; treat every product as unsafe. */
export async function getDraftProductIdSet(): Promise<Set<string> | null> {
  const ids = await getDraftProductIdsSafe();
  return ids === null ? null : new Set(ids);
}

export function filterDraftEdges<T extends ProductsCollection>(
  collection: T,
  draftIds: Set<string> | null,
): T {
  if (!collection?.edges?.length) return collection;

  if (draftIds === null) {
    return { ...collection, edges: [] } as T;
  }

  if (draftIds.size === 0) return collection;

  return {
    ...collection,
    edges: collection.edges.filter((edge) => !draftIds.has(edge.node.id)),
  } as T;
}

export async function filterDraftProductsFromCollection<
  T extends ProductsCollection,
>(collection: T): Promise<T> {
  if (!collection?.edges?.length) return collection;

  const draftIds = await getDraftProductIdSet();
  return filterDraftEdges(collection, draftIds);
}
