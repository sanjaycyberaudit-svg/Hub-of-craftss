import {
  formatCartGstLabel,
  shouldShowCartDiscountRows,
} from "./cart-order-summary-display";

describe("formatCartGstLabel", () => {
  it("shows percentage when GST is enabled", () => {
    expect(formatCartGstLabel({ gstEnabled: true, gstPercentage: 18 })).toBe(
      "GST (18%)",
    );
    expect(formatCartGstLabel({ gstEnabled: true, gstPercentage: 5 })).toBe(
      "GST (5%)",
    );
  });

  it("falls back to GST without rate when disabled or zero", () => {
    expect(formatCartGstLabel({ gstEnabled: false, gstPercentage: 18 })).toBe(
      "GST",
    );
    expect(formatCartGstLabel({ gstEnabled: true, gstPercentage: 0 })).toBe(
      "GST",
    );
  });
});

describe("shouldShowCartDiscountRows", () => {
  it("shows when discount or promo percent is present", () => {
    expect(shouldShowCartDiscountRows({ discountAmount: 10 })).toBe(true);
    expect(
      shouldShowCartDiscountRows({ discountAmount: 0, promoPercentage: 5 }),
    ).toBe(true);
    expect(shouldShowCartDiscountRows({ discountAmount: 0 })).toBe(false);
  });
});
