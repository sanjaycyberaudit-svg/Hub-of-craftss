import { buildOrderPaymentBreakdown } from "./order-payment-breakdown";

describe("buildOrderPaymentBreakdown", () => {
  it("renders full cart-like rows from payment_meta", () => {
    const result = buildOrderPaymentBreakdown({
      orderAmount: 4404,
      paymentMeta: {
        subtotalAmount: 3632,
        discountAmount: 0,
        discountPercentage: 0,
        promoCode: null,
        discountedSubtotal: 3632,
        courierCharge: 100,
        courierRule: "qty1_base",
        gstAmount: 672,
        gstEnabled: true,
        gstPercentage: 18,
      },
    });

    expect(result.total).toBe(4404);
    expect(result.hasPricingMeta).toBe(true);
    expect(result.lines.map((l) => l.key)).toEqual([
      "subtotal",
      "courier",
      "gst",
      "total",
    ]);
    expect(result.lines.find((l) => l.key === "gst")?.label).toBe("GST (18%)");
    expect(result.lines.find((l) => l.key === "total")?.amount).toBe(4404);
    expect(result.lines.find((l) => l.key === "subtotal")?.amount).toBe(3632);
  });

  it("shows discount rows only when a discount applies", () => {
    const withDiscount = buildOrderPaymentBreakdown({
      orderAmount: 1000,
      paymentMeta: {
        subtotalAmount: 1000,
        discountAmount: 50,
        discountPercentage: 5,
        promoCode: "WELCOME5",
        discountedSubtotal: 950,
        courierCharge: 0,
        courierRule: "free_shipping",
        gstAmount: 50,
        gstEnabled: true,
        gstPercentage: 5,
      },
    });

    expect(withDiscount.lines.map((l) => l.key)).toEqual([
      "subtotal",
      "discount",
      "discountedSubtotal",
      "courier",
      "gst",
      "total",
    ]);
    expect(withDiscount.lines.find((l) => l.key === "discount")?.label).toMatch(
      /WELCOME5/,
    );
    expect(withDiscount.lines.find((l) => l.key === "courier")?.valueKind).toBe(
      "free",
    );
  });

  it("falls back to line subtotal when meta lacks pricing keys", () => {
    const result = buildOrderPaymentBreakdown({
      orderAmount: 2391,
      paymentMeta: null,
      lineItems: [
        { unitPrice: 799, quantity: 1 },
        { unitPrice: 199, quantity: 1 },
        { unitPrice: 229, quantity: 1 },
        { unitPrice: 699, quantity: 1 },
      ],
    });

    expect(result.hasPricingMeta).toBe(false);
    expect(result.lines.map((l) => l.key)).toEqual(["subtotal", "total"]);
    expect(result.lines[0]?.amount).toBe(1926);
    expect(result.lines.find((l) => l.key === "total")?.amount).toBe(2391);
  });

  it("always uses orderAmount as total even if meta sums differ", () => {
    const result = buildOrderPaymentBreakdown({
      orderAmount: 999,
      paymentMeta: {
        subtotalAmount: 100,
        courierCharge: 10,
        gstAmount: 5,
        gstEnabled: true,
        gstPercentage: 18,
      },
    });
    expect(result.lines.find((l) => l.key === "total")?.amount).toBe(999);
  });

  it("shows courier as entered with a single GST line (no courier GST row)", () => {
    const result = buildOrderPaymentBreakdown({
      orderAmount: 624,
      paymentMeta: {
        subtotalAmount: 449,
        courierCharge: 80,
        courierRule: "qty1_base",
        gstAmount: 95,
        gstEnabled: true,
        gstPercentage: 18,
      },
    });

    expect(result.lines.map((l) => l.key)).toEqual([
      "subtotal",
      "courier",
      "gst",
      "total",
    ]);
    expect(result.lines.find((l) => l.key === "subtotal")?.amount).toBe(449);
    expect(result.lines.find((l) => l.key === "courier")?.amount).toBe(80);
    expect(result.lines.find((l) => l.key === "gst")?.amount).toBe(95);
  });

  it("marks GST as not applied when it was off at checkout", () => {
    const result = buildOrderPaymentBreakdown({
      orderAmount: 529,
      paymentMeta: {
        subtotalAmount: 449,
        courierCharge: 80,
        courierRule: "qty1_base",
        gstAmount: 0,
        gstEnabled: false,
        gstPercentage: 18,
      },
    });

    expect(result.lines.find((l) => l.key === "subtotal")?.amount).toBe(449);
    expect(result.lines.find((l) => l.key === "courier")?.amount).toBe(80);
    expect(result.lines.find((l) => l.key === "gst")?.valueKind).toBe(
      "not_applied",
    );
    expect(result.lines.find((l) => l.key === "total")?.amount).toBe(529);
  });
});
