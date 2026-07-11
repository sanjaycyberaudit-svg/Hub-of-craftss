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

  it("unwraps JSON-string payment_meta so stock release can see holds", () => {
    const encoded = JSON.stringify({
      stockReserved: true,
      stockReservationExpiresAt: "2026-07-10T11:14:53.173Z",
      stockReservationLines: [{ productId: "p1", quantity: 1 }],
      paymentEnvironment: "production",
    });

    const meta = readPaymentMeta(encoded);
    expect(meta.stockReserved).toBe(true);
    expect(meta.stockReservationLines).toEqual([
      { productId: "p1", quantity: 1 },
    ]);
    expect(meta.paymentEnvironment).toBe("production");
  });

  it("unwraps double-encoded JSON strings", () => {
    const doubleEncoded = JSON.stringify(
      JSON.stringify({ stockReserved: true, paymentEnvironment: "production" }),
    );
    const meta = readPaymentMeta(doubleEncoded);
    expect(meta.stockReserved).toBe(true);
    expect(meta.paymentEnvironment).toBe("production");
  });

  it("merges patches onto string-encoded existing meta", () => {
    const existing = JSON.stringify({
      stockReserved: true,
      stockReservationLines: [{ productId: "p1", quantity: 1 }],
    });
    const merged = mergePaymentMeta(existing, {
      stockReleased: true,
      stockReleaseReason: "reservation_expired",
    });
    expect(merged.stockReserved).toBe(true);
    expect(merged.stockReleased).toBe(true);
    expect(merged.stockReservationLines).toEqual([
      { productId: "p1", quantity: 1 },
    ]);
  });
});
