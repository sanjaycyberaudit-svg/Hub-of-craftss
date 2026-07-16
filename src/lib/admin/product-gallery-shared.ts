export const MAX_PRODUCT_IMAGES = 5;

/** Ordered unique media ids — first is featured/main. */
export function normalizeProductImageMediaIds(
  mediaIds: string[],
  max = MAX_PRODUCT_IMAGES,
): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const raw of mediaIds) {
    const id = String(raw ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
    if (unique.length >= max) break;
  }

  return unique;
}
