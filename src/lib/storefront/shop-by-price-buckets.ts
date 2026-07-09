import {
  getEffectiveProductPrice,
  isEffectivePriceInDisplayRange,
} from "@/lib/products/discount";
import { formatPrice } from "@/lib/utils";

/** Retail breakpoints; first tier covers budget items below ₹300. */
export const SHOP_BY_PRICE_BREAKPOINTS = [
  1, 300, 500, 800, 1000, 1500, 2000, 3000, 5000, 7000,
] as const;

export type ShopByPriceProductInput = {
  id: string;
  price: string | number | null | undefined;
  discountEnabled?: boolean | null;
  discountPercent?: number | null;
  featured?: boolean | null;
  mediaKey?: string | null;
  mediaAlt?: string | null;
};

export type ShopByPriceBucket = {
  id: string;
  label: string;
  min: number;
  max: number;
  productCount: number;
  imageKey: string | null;
  imageAlt: string;
  href: string;
};

export function formatPriceRangeLabel(min: number, max: number): string {
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}

function displayMaxForBucket(
  min: number,
  nextBreakpoint: number,
  isLast: boolean,
): number {
  if (isLast) return nextBreakpoint;
  return nextBreakpoint - 1;
}

function pickRepresentativeProduct(products: ShopByPriceProductInput[]) {
  const pool = products.filter((product) => product.mediaKey);
  if (!pool.length) return null;

  const featured = pool.find((product) => product.featured);
  if (featured) return featured;

  const sorted = [...pool].sort(
    (a, b) => getEffectiveProductPrice(a) - getEffectiveProductPrice(b),
  );
  return sorted[Math.floor(sorted.length / 2)] ?? pool[0];
}

export function buildShopByPriceBuckets(
  products: ShopByPriceProductInput[],
  breakpoints: readonly number[] = SHOP_BY_PRICE_BREAKPOINTS,
): ShopByPriceBucket[] {
  if (products.length === 0 || breakpoints.length < 2) return [];

  const priced = products
    .map((product) => ({
      ...product,
      effectivePrice: getEffectiveProductPrice(product),
    }))
    .filter((product) => product.effectivePrice > 0);

  if (!priced.length) return [];

  const buckets: ShopByPriceBucket[] = [];

  for (let index = 0; index < breakpoints.length - 1; index += 1) {
    const min = breakpoints[index];
    const nextBreakpoint = breakpoints[index + 1];
    const isLast = index === breakpoints.length - 2;
    const displayMax = displayMaxForBucket(min, nextBreakpoint, isLast);

    const inBucket = priced.filter((product) =>
      isEffectivePriceInDisplayRange(product, min, displayMax),
    );

    if (!inBucket.length) continue;

    const representative = pickRepresentativeProduct(inBucket);
    if (!representative?.mediaKey) continue;

    buckets.push({
      id: `${min}-${displayMax}`,
      label: formatPriceRangeLabel(min, displayMax),
      min,
      max: displayMax,
      productCount: inBucket.length,
      imageKey: representative.mediaKey ?? null,
      imageAlt:
        representative.mediaAlt?.trim() ||
        `Sarees priced ${formatPriceRangeLabel(min, displayMax)}`,
      href: `/shop?price_range=${min}-${displayMax}&sort=PRICE_LOW_TO_HIGH`,
    });
  }

  return buckets;
}
