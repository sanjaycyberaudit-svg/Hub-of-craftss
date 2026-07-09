import "server-only";

import db from "@/lib/supabase/db";
import { collections, medias } from "@/lib/supabase/schema";
import { eq, ilike, or } from "drizzle-orm";
import {
  toStorefrontSearchPattern,
  type StorefrontCollectionMatch,
} from "./search-utils";

export type { StorefrontCollectionMatch } from "./search-utils";
export {
  NO_COLLECTION_MATCH_ID,
  normalizeStorefrontSearchTerm,
  toStorefrontSearchPattern,
} from "./search-utils";

export async function findMatchingCollections(
  searchTerm: string,
): Promise<StorefrontCollectionMatch[]> {
  const pattern = toStorefrontSearchPattern(searchTerm);

  const rows = await db
    .select({
      id: collections.id,
      label: collections.label,
      slug: collections.slug,
      imageKey: medias.key,
      imageAlt: medias.alt,
    })
    .from(collections)
    .innerJoin(medias, eq(collections.featuredImageId, medias.id))
    .where(
      or(
        ilike(collections.label, pattern),
        ilike(collections.title, pattern),
        ilike(collections.slug, pattern),
        ilike(collections.description, pattern),
      ),
    )
    .orderBy(collections.order);

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    slug: row.slug,
    featuredImage: {
      key: row.imageKey,
      alt: row.imageAlt,
    },
  }));
}
