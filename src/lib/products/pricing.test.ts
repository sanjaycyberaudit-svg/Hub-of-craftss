import {
  normalizeProductPricingFields,
  resolveProductPricing,
  resolveProductUnitPrice,
} from "./pricing";

describe("resolveProductPricing", () => {
  it("uses list price when discount flag is not strictly true", () => {
    expect(
      resolveProductUnitPrice({
        price: "300",
        discountEnabled: false,
        discountPercent: 37,
      }),
    ).toBe(300);
  });

  it("ignores stale snake_case discount flags when disabled", () => {
    expect(
      resolveProductUnitPrice(
        normalizeProductPricingFields({
          price: "300",
          discount_enabled: false,
          discount_percent: 37,
        }),
      ),
    ).toBe(300);
  });

  it("applies discount only when explicitly enabled", () => {
    expect(
      resolveProductPricing({
        price: "300",
        discountEnabled: true,
        discountPercent: 37,
      }).unitPrice,
    ).toBe(189);
  });
});
