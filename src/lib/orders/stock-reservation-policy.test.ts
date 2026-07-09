import {
  PAYMENT_SESSION_HOLD_MINUTES,
  STOCK_HOLD_AFTER_PAYMENT_GRACE_MINUTES,
  STOCK_HOLD_ORPHAN_FALLBACK_MINUTES,
  STOCK_HOLD_PRE_PAYMENT_MINUTES,
  buildCashfreeOrderExpiryIso,
  resolveStockHoldTtlMinutes,
  stockHoldMinutesAfterPaymentSessionOpened,
} from "./stock-reservation-policy";

describe("stock reservation policy", () => {
  it("uses payment session window plus grace for active holds", () => {
    expect(stockHoldMinutesAfterPaymentSessionOpened()).toBe(
      PAYMENT_SESSION_HOLD_MINUTES + STOCK_HOLD_AFTER_PAYMENT_GRACE_MINUTES,
    );
    expect(stockHoldMinutesAfterPaymentSessionOpened()).toBe(20);
  });

  it("defines orphan fallback as pre-payment + payment + grace", () => {
    expect(STOCK_HOLD_ORPHAN_FALLBACK_MINUTES).toBe(
      STOCK_HOLD_PRE_PAYMENT_MINUTES +
        PAYMENT_SESSION_HOLD_MINUTES +
        STOCK_HOLD_AFTER_PAYMENT_GRACE_MINUTES,
    );
  });

  it("reads ttl minutes from payment meta when present", () => {
    expect(resolveStockHoldTtlMinutes({ stockReservationTtlMinutes: 25 })).toBe(
      25,
    );
    expect(resolveStockHoldTtlMinutes({})).toBe(20);
  });

  it("builds cashfree order expiry at payment session length", () => {
    const now = Date.parse("2026-07-07T10:00:00.000Z");
    const expiry = buildCashfreeOrderExpiryIso(now);
    expect(Date.parse(expiry)).toBe(
      now + PAYMENT_SESSION_HOLD_MINUTES * 60_000,
    );
  });
});
