export const PRODUCT_SUGGEST_MIN_CHARS = 2;
export const PRODUCT_SUGGEST_MAX_CHARS = 64;
export const PRODUCT_SUGGEST_DEFAULT_LIMIT = 8;
export const PRODUCT_SUGGEST_MAX_LIMIT = 12;

export type ProductNameSuggestion = {
  id: string;
  name: string;
  slug: string;
  featuredImage: {
    key: string;
    alt: string | null;
  } | null;
};

/** Strip ILIKE wildcards so user input cannot broaden the pattern. */
export function sanitizeSuggestQuery(
  raw: string | null | undefined,
  normalize: (search: string | null | undefined) => string | null,
): string | null {
  const normalized = normalize(raw);
  if (!normalized) return null;
  const cleaned = normalized.replace(/[%_]/g, "").trim();
  if (cleaned.length < PRODUCT_SUGGEST_MIN_CHARS) return null;
  return cleaned.slice(0, PRODUCT_SUGGEST_MAX_CHARS);
}

export function clampSuggestLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return PRODUCT_SUGGEST_DEFAULT_LIMIT;
  return Math.min(PRODUCT_SUGGEST_MAX_LIMIT, Math.max(1, Math.round(n)));
}
