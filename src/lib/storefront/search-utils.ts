export type StorefrontCollectionMatch = {
  id: string;
  label: string;
  slug: string;
  featuredImage: {
    key: string;
    alt: string | null;
  };
};

/** Placeholder ID so GraphQL `in` filters stay valid when no collections match. */
export const NO_COLLECTION_MATCH_ID = "__no_collection_match__";

export function normalizeStorefrontSearchTerm(
  search: string | null | undefined,
): string | null {
  if (!search) return null;
  const term = search.replace(/^%|%$/g, "").trim();
  return term.length > 0 ? term : null;
}

export function toStorefrontSearchPattern(term: string): string {
  return `%${term}%`;
}
