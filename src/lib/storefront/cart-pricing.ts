import { getProductsByIds } from "@/_actions/products";
import {
  resolveProductPricing,
  type ResolvedProductPricing,
} from "@/lib/products/pricing";

export type CartProductPricing = ResolvedProductPricing & {
  productId: string;
};

export async function getCartProductPricingByIds(
  productIds: string[],
): Promise<Record<string, CartProductPricing>> {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  if (uniqueIds.length === 0) return {};

  const rows = await getProductsByIds(uniqueIds);
  const pricing: Record<string, CartProductPricing> = {};

  for (const row of rows) {
    const resolved = resolveProductPricing(row);
    pricing[row.id] = {
      productId: row.id,
      ...resolved,
    };
  }

  return pricing;
}
