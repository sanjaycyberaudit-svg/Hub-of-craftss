import { dangerouslyDeleteByTag } from "@vercel/functions";

const TAGS_PER_PURGE = 50;

/**
 * Deletes edge-cached responses carrying any of `tags` (`Vercel-Cache-Tag`), so
 * the next request is a fresh MISS rather than one more stale hit. No-op off Vercel.
 */
export async function purgeEdgeCacheTags(
  tags: readonly string[],
): Promise<void> {
  const unique = [...new Set(tags.filter(Boolean))];
  for (let i = 0; i < unique.length; i += TAGS_PER_PURGE) {
    try {
      await dangerouslyDeleteByTag(unique.slice(i, i + TAGS_PER_PURGE));
    } catch (error) {
      console.warn("[cache] edge purge failed:", error);
    }
  }
}
