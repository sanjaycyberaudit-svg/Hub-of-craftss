import { mergePaymentMeta, readPaymentMeta } from "./payment-meta";

describe("payment meta helpers", () => {
  it("merges without dropping existing reservation fields", () => {
    const merged = mergePaymentMeta(
      {
        stockReserved: true,
        stockReservationExpiresAt: "2026-06-28T11:00:00.000Z",
        stockReservationLines: [{ productId: "p1", quantity: 1 }],
        paymentEnvironment: "production",
        linePricing: { p1: { unitPrice: 300 } },
      },
      {
        cashfreeOrderStatus: "PAID",
      },
    );

    expect(merged.stockReserved).toBe(true);
    expect(merged.stockReservationLines).toEqual([
      { productId: "p1", quantity: 1 },
    ]);
    expect(merged.paymentEnvironment).toBe("production");
    expect(merged.cashfreeOrderStatus).toBe("PAID");
  });

  it("returns empty object for missing meta", () => {
    expect(readPaymentMeta(null)).toEqual({});
  });
});
