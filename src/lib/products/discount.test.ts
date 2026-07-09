import {
  getEffectiveProductPrice,
  getOriginalProductPrice,
  getSaleProductPrice,
  isProductDiscountActive,
  normalizeDiscountPercent,
} from "./discount";

describe("product discount", () => {
  it("returns original price when discount is off", () => {
    expect(
      getEffectiveProductPrice({ price: "1300", discountEnabled: false }),
    ).toBe(1300);
    expect(
      isProductDiscountActive({ price: "1300", discountEnabled: false }),
    ).toBe(false);
  });

  it("applies percentage reduction when discount is on", () => {
    const product = {
      price: "1300",
      discountEnabled: true,
      discountPercent: 50,
    };
    expect(getOriginalProductPrice(product)).toBe(1300);
    expect(getSaleProductPrice(product)).toBe(650);
    expect(getEffectiveProductPrice(product)).toBe(650);
  });

  it("rejects invalid discount percentages", () => {
    expect(normalizeDiscountPercent(0)).toBeNull();
    expect(normalizeDiscountPercent(100)).toBeNull();
    expect(
      isProductDiscountActive({
        price: "1000",
        discountEnabled: true,
        discountPercent: 0,
      }),
    ).toBe(false);
  });
});
