export const PRODUCT_OPTION_NAME_MAX = 24;
export const PRODUCT_OPTION_VALUE_MAX = 24;
export const DEFAULT_PRODUCT_OPTION_NAME = "Size";

export type ProductSizeOption = {
  /** Option choice label (e.g. XL, WITH MAGNET). */
  value: string;
  qty: number;
  /**
   * Legacy alias of `value` — kept so cart/checkout/reservation code that
   * still reads `option.size` keeps working without a break-cut rename.
   */
  size: string;
};

export type ProductSizeConfig = {
  enabled: boolean;
  /** Admin-defined group name shown on the storefront (Size, Magnet, …). */
  name: string;
  options: ProductSizeOption[];
};

function normalizeOptionValue(raw: unknown) {
  return String(raw ?? "")
    .trim()
    .slice(0, PRODUCT_OPTION_VALUE_MAX)
    .toUpperCase();
}

function normalizeOptionName(raw: unknown) {
  const name = String(raw ?? "")
    .trim()
    .slice(0, PRODUCT_OPTION_NAME_MAX);
  return name || DEFAULT_PRODUCT_OPTION_NAME;
}

function normalizeQty(raw: unknown) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed * 100) / 100);
}

/** Prefer `value`, fall back to legacy `size` field from older rows. */
export function readOptionValue(row: Record<string, unknown>): string {
  const fromValue = normalizeOptionValue(row.value);
  if (fromValue) return fromValue;
  return normalizeOptionValue(row.size);
}

export function getProductOptionDisplayName(
  config: Pick<ProductSizeConfig, "name"> | null | undefined,
): string {
  return normalizeOptionName(config?.name);
}

export function getSelectableProductOptions(
  config: ProductSizeConfig | null | undefined,
): ProductSizeOption[] {
  if (!config?.enabled) return [];
  return config.options.filter((option) => Number(option.qty ?? 0) > 0);
}

export function normalizeProductSizeConfig(raw: unknown): ProductSizeConfig {
  const source = (raw ?? {}) as Record<string, unknown>;
  const enabled = Boolean(source.enabled ?? false);
  const name = normalizeOptionName(source.name);
  const optionsRaw = Array.isArray(source.options) ? source.options : [];
  const dedup = new Map<string, ProductSizeOption>();

  for (const item of optionsRaw) {
    const row = item as Record<string, unknown>;
    const value = readOptionValue(row);
    const qty = normalizeQty(row.qty);
    if (!value && qty <= 0) continue;
    const dedupKey = value || "__NO_LABEL__";
    dedup.set(dedupKey, { value, size: value, qty });
  }

  return {
    enabled,
    name,
    options: Array.from(dedup.values()),
  };
}

/** Persist shape: name + value only (no legacy `size` key). */
export function serializeProductSizeConfig(
  config: ProductSizeConfig,
): Record<string, unknown> {
  const normalized = normalizeProductSizeConfig(config);
  return {
    enabled: normalized.enabled,
    name: normalized.name,
    options: normalized.options.map((option) => ({
      value: option.value,
      qty: option.qty,
    })),
  };
}
