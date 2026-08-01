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
  /**
   * List/MRP for this option. `null` means legacy/unset — storefront falls
   * back to the product-level price until an admin saves an explicit value.
   */
  price: number | null;
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

/** Money-safe option price; returns null when missing/invalid (legacy rows). */
export function normalizeOptionPrice(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
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

export function findProductSizeOption(
  config: ProductSizeConfig | null | undefined,
  selectedSize: string | null | undefined,
): ProductSizeOption | null {
  const selectable = getSelectableProductOptions(config);
  if (selectable.length === 0) return null;

  const normalized = String(selectedSize ?? "")
    .trim()
    .toUpperCase();
  if (normalized) {
    return (
      selectable.find(
        (option) =>
          String(option.value ?? option.size ?? "")
            .trim()
            .toUpperCase() === normalized,
      ) ?? null
    );
  }

  // Empty-label stock-only option (allowed when a single unlabeled row exists).
  return (
    selectable.find(
      (option) => !String(option.value ?? option.size ?? "").trim(),
    ) ?? null
  );
}

/** Explicit option MRP when set; otherwise null (caller may fall back). */
export function getOptionListPrice(
  option: Pick<ProductSizeOption, "price"> | null | undefined,
): number | null {
  if (!option) return null;
  return normalizeOptionPrice(option.price);
}

/**
 * Resolve the list/MRP that should be charged for a cart/checkout line.
 * When options are enabled, prefer the selected option's price; legacy options
 * without a price fall back to the product-level list price.
 */
export function resolveListPriceForSelection(args: {
  baseListPrice: number;
  sizeConfig: ProductSizeConfig | null | undefined;
  selectedSize?: string | null;
  /** When true and no option is selected yet, use the cheapest option price. */
  preferMinWhenUnselected?: boolean;
}): number {
  const base =
    Number.isFinite(args.baseListPrice) && args.baseListPrice >= 0
      ? Math.round(args.baseListPrice * 100) / 100
      : 0;

  const selectable = getSelectableProductOptions(args.sizeConfig);
  if (selectable.length === 0) return base;

  const selected = findProductSizeOption(args.sizeConfig, args.selectedSize);
  if (selected) {
    return getOptionListPrice(selected) ?? base;
  }

  if (args.preferMinWhenUnselected) {
    const priced = selectable
      .map((option) => getOptionListPrice(option))
      .filter((price): price is number => price != null);
    if (priced.length > 0) {
      return Math.min(...priced);
    }
  }

  return base;
}

/** Lowest explicit option MRP among selectable options, if any. */
export function getMinSelectableOptionPrice(
  config: ProductSizeConfig | null | undefined,
): number | null {
  const priced = getSelectableProductOptions(config)
    .map((option) => getOptionListPrice(option))
    .filter((price): price is number => price != null);
  if (priced.length === 0) return null;
  return Math.min(...priced);
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
    const price = normalizeOptionPrice(row.price);
    if (!value && qty <= 0) continue;
    const dedupKey = value || "__NO_LABEL__";
    dedup.set(dedupKey, { value, size: value, qty, price });
  }

  return {
    enabled,
    name,
    options: Array.from(dedup.values()),
  };
}

/** Persist shape: name + value (+ price when set). No legacy `size` key. */
export function serializeProductSizeConfig(
  config: ProductSizeConfig,
): Record<string, unknown> {
  const normalized = normalizeProductSizeConfig(config);
  return {
    enabled: normalized.enabled,
    name: normalized.name,
    options: normalized.options.map((option) => {
      const row: Record<string, unknown> = {
        value: option.value,
        qty: option.qty,
      };
      if (option.price != null) {
        row.price = option.price;
      }
      return row;
    }),
  };
}
