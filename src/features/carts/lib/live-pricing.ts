import type { CartProductPricing } from "@/lib/storefront/cart-pricing";
import type { ProductDiscountFields } from "@/lib/products/discount";
import type { ProductPackFields } from "@/lib/products/pack";
import {
  resolveProductPricingForSelection,
  toProductDiscountFields,
} from "@/lib/products/pricing";
import {
  normalizeProductSizeConfig,
  type OptionSelections,
  type ProductSizeConfig,
} from "@/lib/products/sizeConfig-shared";

export function withLiveProductPricing<
  T extends ProductDiscountFields & ProductPackFields & { id?: string },
>(product: T, pricing?: CartProductPricing | null): T {
  if (!pricing) return product;

  return {
    ...product,
    price: String(pricing.listPrice),
    discountEnabled: pricing.discountActive,
    discountPercent: pricing.discountPercent,
    soldAsPack: pricing.soldAsPack ?? false,
    packSize: pricing.packSize ?? null,
  };
}

/** Apply live product pricing, then override list price from selections. */
export function withLiveLinePricing<
  T extends ProductDiscountFields & ProductPackFields & { id?: string },
>(
  product: T,
  pricing: CartProductPricing | null | undefined,
  sizeConfig: ProductSizeConfig | null | undefined,
  selectedSize: string | null | undefined,
  selections?: OptionSelections | null,
): T {
  const withProduct = withLiveProductPricing(product, pricing);
  if (!sizeConfig?.enabled) return withProduct;

  const resolved = resolveProductPricingForSelection({
    product: withProduct,
    sizeConfig,
    selectedSize,
    selections,
  });
  const fields = toProductDiscountFields(resolved);
  return {
    ...withProduct,
    price: String(fields.price),
    discountEnabled: fields.discountEnabled,
    discountPercent: fields.discountPercent,
  };
}

export function toSizeConfigFromCartPayload(
  payload: unknown,
): ProductSizeConfig {
  return normalizeProductSizeConfig(payload ?? {});
}
