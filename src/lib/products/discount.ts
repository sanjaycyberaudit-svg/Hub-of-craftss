export type ProductDiscountFields = {
  price: string | number | null | undefined;
  discountEnabled?: boolean | null;
  discountPercent?: number | null;
};

export function normalizeDiscountPercent(raw: unknown): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 99) return null;
  return rounded;
}

export function isProductDiscountActive(
  product: ProductDiscountFields,
): boolean {
  if (product.discountEnabled !== true) return false;
  return normalizeDiscountPercent(product.discountPercent) !== null;
}

export function getOriginalProductPrice(
  product: ProductDiscountFields,
): number {
  const value = Number(product.price ?? 0);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100) / 100;
}

export function getSaleProductPrice(product: ProductDiscountFields): number {
  const original = getOriginalProductPrice(product);
  if (!isProductDiscountActive(product)) return original;

  const percent = normalizeDiscountPercent(product.discountPercent)!;
  const sale = original * (1 - percent / 100);
  return Math.round(sale * 100) / 100;
}

/** Price charged at checkout and shown as the main sale price. */
export function getEffectiveProductPrice(
  product: ProductDiscountFields,
): number {
  return getSaleProductPrice(product);
}

/**
 * Whole-rupee sale price used for price-range placement.
 * Rounding avoids the fractional dead zone between buckets
 * (e.g. a discounted ₹799.80 becomes ₹800 → the ₹800–₹999 tier).
 */
export function getRoundedEffectiveProductPrice(
  product: ProductDiscountFields,
): number {
  return Math.round(getEffectiveProductPrice(product));
}

/** Same inclusive range used for homepage buckets and /shop?price_range= pages. */
export function isEffectivePriceInDisplayRange(
  product: ProductDiscountFields,
  min: number,
  max: number,
): boolean {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    return false;
  }

  const effectivePrice = getRoundedEffectiveProductPrice(product);
  return effectivePrice >= min && effectivePrice <= max;
}

export function formatDiscountBadgeLabel(percent: number): string {
  return `-${Math.round(percent)}%`;
}
