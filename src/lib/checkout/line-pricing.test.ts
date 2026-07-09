import {
  buildCheckoutLinePricingRecord,
  calcCheckoutSubtotal,
  type CheckoutPricedLine,
} from "./line-pricing";
import { resolveProductUnitPrice } from "@/lib/products/pricing";

function makeLine(
  overrides: Partial<CheckoutPricedLine & { id: string }> = {},
): CheckoutPricedLine & { id: string } {
  return {
    id: "product-1",
    quantity: 1,
    pricing: {
      productId: "product-1",
      listPrice: 1600,
      unitPrice: 800,
      discountActive: true,
      discountPercent: 50,
    },
    ...overrides,
  };
}

describe("checkout line pricing", () => {
  it("charges MRP 1600 with 50% discount as 800", () => {
    const line = makeLine();

    expect(calcCheckoutSubtotal([line])).toBe(800);
    expect(buildCheckoutLinePricingRecord([line])).toEqual({
      "product-1": {
        listPrice: 1600,
        unitPrice: 800,
        discountActive: true,
        discountPercent: 50,
      },
    });
  });

  it("documents the old double-discount bug we must avoid", () => {
    const line = makeLine();

    expect(
      resolveProductUnitPrice({
        price: String(line.pricing.unitPrice),
        discountEnabled: true,
        discountPercent: 50,
      }),
    ).toBe(400);
    expect(calcCheckoutSubtotal([line])).toBe(800);
  });

  it("totals multiple quantities from the pricing snapshot", () => {
    const line = makeLine({ quantity: 2 });

    expect(calcCheckoutSubtotal([line])).toBe(1600);
  });
});
