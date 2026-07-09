import {
  getEffectiveProductPrice,
  isEffectivePriceInDisplayRange,
} from "@/lib/products/discount";

describe("shop by price alignment", () => {
  it("matches homepage bucket bounds for mid-tier sarees", () => {
    const products = [
      { price: "899.00", discountEnabled: false, discountPercent: null },
      { price: "999.00", discountEnabled: false, discountPercent: null },
      { price: "750.00", discountEnabled: false, discountPercent: null },
    ];

    const in800to999 = products.filter((product) => {
      const effective = getEffectiveProductPrice(product);
      return effective >= 800 && effective <= 999;
    });

    expect(in800to999).toHaveLength(2);
  });

  it("uses discounted sale price for bucket placement", () => {
    const product = {
      price: "1200.00",
      discountEnabled: true,
      discountPercent: 40,
    };

    expect(getEffectiveProductPrice(product)).toBe(720);
    expect(getEffectiveProductPrice(product)).toBeGreaterThanOrEqual(500);
    expect(getEffectiveProductPrice(product)).toBeLessThanOrEqual(799);
  });

  it("matches homepage bucket bounds with shop filter bounds", () => {
    const at799 = {
      price: "799.00",
      discountEnabled: false,
      discountPercent: null,
    };
    const at800 = {
      price: "800.00",
      discountEnabled: false,
      discountPercent: null,
    };

    expect(isEffectivePriceInDisplayRange(at799, 500, 799)).toBe(true);
    expect(isEffectivePriceInDisplayRange(at800, 500, 799)).toBe(false);
    expect(isEffectivePriceInDisplayRange(at800, 800, 999)).toBe(true);
  });

  it("rounds fractional discounted prices into a single bucket", () => {
    // ₹2666 with 70% off = ₹799.80 → rounds to ₹800 → ₹800–₹999 tier.
    const discounted = {
      price: "2666.00",
      discountEnabled: true,
      discountPercent: 70,
    };

    expect(getEffectiveProductPrice(discounted)).toBeCloseTo(799.8, 2);
    expect(isEffectivePriceInDisplayRange(discounted, 500, 799)).toBe(false);
    expect(isEffectivePriceInDisplayRange(discounted, 800, 999)).toBe(true);
  });
});
