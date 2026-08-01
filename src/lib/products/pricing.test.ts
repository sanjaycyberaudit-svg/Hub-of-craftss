import {
  normalizeProductPricingFields,
  resolveProductPricing,
  resolveProductPricingForSelection,
  resolveProductUnitPrice,
} from "./pricing";
import { normalizeProductSizeConfig } from "./sizeConfig-shared";

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

describe("resolveProductPricingForSelection", () => {
  it("applies product discount on top of the selected option price", () => {
    const sizeConfig = normalizeProductSizeConfig({
      enabled: true,
      options: [{ value: "XL", qty: 2, price: 500 }],
    });

    const priced = resolveProductPricingForSelection({
      product: {
        price: "999",
        discountEnabled: true,
        discountPercent: 20,
      },
      sizeConfig,
      selectedSize: "XL",
    });

    expect(priced.listPrice).toBe(500);
    expect(priced.unitPrice).toBe(400);
    expect(priced.discountActive).toBe(true);
  });

  it("sums multi-group selections before applying discount", () => {
    const sizeConfig = normalizeProductSizeConfig({
      enabled: true,
      groups: [
        {
          id: "size",
          name: "Size",
          options: [{ value: "M", qty: 1, price: 300 }],
        },
        {
          id: "magnet",
          name: "Magnet",
          options: [{ value: "WITH MAGNET", qty: 1, price: 100 }],
        },
      ],
    });

    const priced = resolveProductPricingForSelection({
      product: {
        price: "999",
        discountEnabled: true,
        discountPercent: 10,
      },
      sizeConfig,
      selections: { size: "M", magnet: "WITH MAGNET" },
    });

    expect(priced.listPrice).toBe(400);
    expect(priced.unitPrice).toBe(360);
  });
});
