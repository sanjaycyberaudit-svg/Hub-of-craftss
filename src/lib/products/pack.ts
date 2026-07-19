export type ProductPackFields = {
  soldAsPack?: boolean | null;
  packSize?: number | null;
};

/** True when product is sold as a labeled set/pack with a valid size. */
export function isProductSoldAsPack(
  product: ProductPackFields | null | undefined,
): boolean {
  if (!product?.soldAsPack) return false;
  const size = Number(product.packSize);
  return Number.isInteger(size) && size >= 2 && size <= 9999;
}

export function getProductPackSize(
  product: ProductPackFields | null | undefined,
): number | null {
  if (!isProductSoldAsPack(product)) return null;
  return Number(product.packSize);
}

/** Storefront label e.g. "Set of 50". */
export function formatProductPackLabel(
  product: ProductPackFields | null | undefined,
): string | null {
  const size = getProductPackSize(product);
  if (size == null) return null;
  return `Set of ${size}`;
}
