import type { CartProductPricing } from "@/lib/storefront/cart-pricing";

export type CheckoutLinePricingSnapshot = {
  listPrice: number;
  unitPrice: number;
  discountActive: boolean;
  discountPercent: number | null;
};

export type CheckoutPricedLine = {
  quantity: number;
  pricing: CartProductPricing;
};

/** Sum line totals using the pricing snapshot only — never re-apply discount. */
export function calcCheckoutSubtotal(lines: CheckoutPricedLine[]): number {
  return lines.reduce((total, line) => {
    if (line.quantity <= 0) return total;
    return total + line.quantity * line.pricing.unitPrice;
  }, 0);
}

export function buildCheckoutLinePricingRecord(
  lines: Array<CheckoutPricedLine & { id: string }>,
): Record<string, CheckoutLinePricingSnapshot> {
  return Object.fromEntries(
    lines.map((line) => [
      line.id,
      {
        listPrice: line.pricing.listPrice,
        unitPrice: line.pricing.unitPrice,
        discountActive: line.pricing.discountActive,
        discountPercent: line.pricing.discountPercent,
      },
    ]),
  );
}
