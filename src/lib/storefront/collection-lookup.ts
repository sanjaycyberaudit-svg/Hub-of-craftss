import { slugify, unslugify } from "@/lib/utils";

export type CollectionLookupVariables = {
  exactSlug: string;
  slugified: string;
  labelPattern: string;
};

/** Build GraphQL lookup candidates from a URL segment (handles spaces, case, hyphens). */
export function buildCollectionLookup(
  slugParam: string,
): CollectionLookupVariables | null {
  const decoded = decodeURIComponent(slugParam).trim();
  if (!decoded) return null;

  const fromHyphen = unslugify(decoded).trim();
  const slugified =
    slugify(decoded) || slugify(fromHyphen) || decoded.toLowerCase();

  return {
    exactSlug: decoded,
    slugified,
    labelPattern: `%${fromHyphen}%`,
  };
}
