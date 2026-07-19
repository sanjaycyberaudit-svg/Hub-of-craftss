import type { CartProductPricing } from "@/lib/storefront/cart-pricing";
import type { ProductDiscountFields } from "@/lib/products/discount";
import type { ProductPackFields } from "@/lib/products/pack";

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
