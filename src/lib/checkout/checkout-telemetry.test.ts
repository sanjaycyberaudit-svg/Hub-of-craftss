import {
  classifyCheckoutError,
  resolveCheckoutOutcome,
} from "./checkout-outcome";

describe("classifyCheckoutError", () => {
  it("maps payment cancelled", () => {
    expect(classifyCheckoutError(new Error("Payment cancelled."))).toEqual({
      type: "payment_cancelled",
      reason: "Payment cancelled.",
    });
  });

  it("maps cashfree checkout failures", () => {
    expect(
      classifyCheckoutError(new Error("Invalid Cashfree checkout response.")),
    ).toEqual({
      type: "cashfree_script_failed",
      reason: "Invalid Cashfree checkout response.",
    });
  });

  it("maps verify failures", () => {
    expect(
      classifyCheckoutError(new Error("Could not confirm Cashfree payment.")),
    ).toEqual({
      type: "verify_failed",
      reason: "Could not confirm Cashfree payment.",
    });
  });
});

describe("resolveCheckoutOutcome", () => {
  it("returns null for paid orders", () => {
    expect(
      resolveCheckoutOutcome({
        paymentStatus: "paid",
        paymentMeta: {},
      }),
    ).toBeNull();
  });

  it("prefers checkout telemetry", () => {
    expect(
      resolveCheckoutOutcome({
        paymentStatus: "unpaid",
        paymentMeta: {
          checkoutTelemetry: {
            lastEvent: "payment_cancelled",
            lastReason: "Payment cancelled.",
            lastAt: "2026-08-28T00:00:00.000Z",
            events: [],
          },
        },
      }),
    ).toMatchObject({
      kind: "payment_cancelled",
      label: "Cancelled",
    });
  });

  it("falls back to cashfree terminal status", () => {
    expect(
      resolveCheckoutOutcome({
        paymentStatus: "unpaid",
        paymentMeta: {
          cashfreeOrderStatus: "EXPIRED",
        },
      }),
    ).toMatchObject({
      kind: "payment_failed",
      label: "Payment failed",
    });
  });

  it("falls back to abandoned active cashfree state", () => {
    expect(
      resolveCheckoutOutcome({
        paymentStatus: "unpaid",
        paymentMeta: {
          cashfreeOrderStatus: "ACTIVE",
        },
      }),
    ).toMatchObject({
      kind: "abandoned",
      label: "Abandoned",
    });
  });

  it("simulates admin unpaid row after cashfree checkout opened", () => {
    expect(
      resolveCheckoutOutcome({
        paymentStatus: "unpaid",
        paymentMeta: {
          checkoutTelemetry: {
            lastEvent: "cashfree_checkout_opened",
            lastReason: null,
            lastAt: "2026-08-28T09:00:00.000Z",
            events: [
              {
                at: "2026-08-28T09:00:00.000Z",
                type: "cashfree_checkout_opened",
                reason: null,
                source: "client",
              },
            ],
          },
          cashfreeOrderStatus: "ACTIVE",
        },
      }),
    ).toMatchObject({
      kind: "in_progress",
      label: "Payment opened",
    });
  });

  it("simulates admin unpaid row after server-held amount mismatch", () => {
    expect(
      resolveCheckoutOutcome({
        paymentStatus: "unpaid",
        paymentMeta: {
          checkoutTelemetry: {
            lastEvent: "verify_held",
            lastReason: "Expected INR 499, gateway reported INR 1",
            lastAt: "2026-08-28T09:01:00.000Z",
            events: [],
          },
          amountMismatch: {
            expected: 499,
            gatewayReported: 1,
            detectedAt: "2026-08-28T09:01:00.000Z",
          },
        },
      }),
    ).toMatchObject({
      kind: "checkout_error",
      label: "Checkout error",
    });
  });
});
