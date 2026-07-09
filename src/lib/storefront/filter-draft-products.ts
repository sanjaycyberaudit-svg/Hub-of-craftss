import { getDraftProductIdsCached } from "@/lib/storefront/draft-product-ids";

type ProductEdge = {
  node: { id: string };
};

type ProductsCollection = {
  edges: ProductEdge[];
  pageInfo?: unknown;
} | null;

export async function getDraftProductIdSet(): Promise<Set<string>> {
  return new Set(await getDraftProductIdsCached());
}

export function filterDraftEdges<T extends ProductsCollection>(
  collection: T,
  draftIds: Set<string>,
): T {
  if (!collection?.edges?.length || draftIds.size === 0) return collection;

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
