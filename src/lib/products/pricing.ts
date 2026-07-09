import {
  getOriginalProductPrice,
  getSaleProductPrice,
  isProductDiscountActive,
  type ProductDiscountFields,
} from "./discount";

export type ResolvedProductPricing = {
  listPrice: number;
  unitPrice: number;
  discountActive: boolean;
  discountPercent: number | null;
};

/** Build display/checkout fields from a resolved pricing snapshot. */
export function toProductDiscountFields(
  resolved: ResolvedProductPricing,
): ProductDiscountFields {
  return {
    price: resolved.listPrice,
    discountEnabled: resolved.discountActive,
    discountPercent: resolved.discountPercent,
  };
}

/** Normalize pricing fields from Drizzle, GraphQL, or API payloads. */
export function normalizeProductPricingFields(
  raw: Record<string, unknown>,
): ProductDiscountFields {
  const discountEnabledRaw =
    raw.discountEnabled ?? raw.discount_enabled ?? false;

  return {
    price: raw.price as ProductDiscountFields["price"],
    discountEnabled:
      discountEnabledRaw === true || discountEnabledRaw === "true",
    discountPercent: (raw.discountPercent ??
      raw.discount_percent ??
      null) as ProductDiscountFields["discountPercent"],
  };
}

export function resolveProductPricing(
  raw: Record<string, unknown> | ProductDiscountFields,
): ResolvedProductPricing {
  const fields =
    "price" in raw && !("discount_enabled" in raw)
      ? (raw as ProductDiscountFields)
      : normalizeProductPricingFields(raw as Record<string, unknown>);

  const listPrice = getOriginalProductPrice(fields);
  const discountActive = isProductDiscountActive(fields);
  const unitPrice = getSaleProductPrice(fields);

  return {
    listPrice,
    unitPrice,
    discountActive,
    discountPercent: discountActive
      ? Number(fields.discountPercent ?? null)
      : null,
  };
}

export function resolveProductUnitPrice(
  raw: Record<string, unknown> | ProductDiscountFields,
): number {
  return resolveProductPricing(raw).unitPrice;
}
