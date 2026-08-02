import { PRODUCT_OPTION_NAME_MAX } from "@/lib/products/sizeConfig-shared";

export const VARIANT_TYPE_CATALOG_KEY = "variant_type_catalog";
export const DEFAULT_VARIANT_TYPE_NAMES = ["Size", "Magnet", "Colour"] as const;
export const VARIANT_TYPE_CATALOG_MAX = 50;

function normalizeVariantTypeName(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .slice(0, PRODUCT_OPTION_NAME_MAX);
}

/**
 * Merge defaults + stored (+ optional incoming) names.
 * Case-insensitive de-dupe; first seen casing wins (defaults first).
 */
export function mergeVariantTypeNames(
  ...lists: Array<readonly string[] | string[] | null | undefined>
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const list of lists) {
    if (!list) continue;
    for (const raw of list) {
      const name = normalizeVariantTypeName(raw);
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(name);
      if (result.length >= VARIANT_TYPE_CATALOG_MAX) return result;
    }
  }

  return result;
}

export function parseVariantTypeCatalogValue(value: unknown): string[] {
  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const names = Array.isArray(record.names) ? record.names.map(String) : [];
  return mergeVariantTypeNames(DEFAULT_VARIANT_TYPE_NAMES, names);
}

export function serializeVariantTypeCatalog(names: string[]) {
  return {
    names: mergeVariantTypeNames(DEFAULT_VARIANT_TYPE_NAMES, names),
  };
}
