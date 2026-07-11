/**
 * Stock hold windows aligned with payment-gateway session norms (India PGs).
 *
 * - Pre-payment: short buffer while order + PG session is created.
 * - After payment opens: match PG checkout window + small grace for webhooks.
 */

/** Typical UPI/card checkout window once the PG page is open (Cashfree/PhonePe). */
export const PAYMENT_SESSION_HOLD_MINUTES = 15;

/** Extra minutes after PG session ends before stock is released (sync/webhook lag). */
export const STOCK_HOLD_AFTER_PAYMENT_GRACE_MINUTES = 5;

/** Brief hold if checkout fails before a payment session is opened. */
export const STOCK_HOLD_PRE_PAYMENT_MINUTES = 8;

/** Orphan recovery when reservation metadata was lost (production unpaid orders). */
export const STOCK_HOLD_ORPHAN_FALLBACK_MINUTES =
  STOCK_HOLD_PRE_PAYMENT_MINUTES +
  PAYMENT_SESSION_HOLD_MINUTES +
  STOCK_HOLD_AFTER_PAYMENT_GRACE_MINUTES;

export function stockHoldMinutesAfterPaymentSessionOpened(): number {
  return PAYMENT_SESSION_HOLD_MINUTES + STOCK_HOLD_AFTER_PAYMENT_GRACE_MINUTES;
}

export function resolveStockHoldTtlMinutes(
  meta: Record<string, unknown>,
): number {
  const fromMeta = Number(meta.stockReservationTtlMinutes ?? 0);
  if (Number.isFinite(fromMeta) && fromMeta > 0) {
    return Math.round(fromMeta);
  }
  return stockHoldMinutesAfterPaymentSessionOpened();
}

/**
 * Cashfree Create Order rejects expiry at exactly 15 minutes:
 * "Expiry time should be more than 15 min and less than 30 days".
 * Use the post-session stock window (15 + 5 grace = 20) so PG + webhook lag fit.
 */
export const CASHFREE_ORDER_EXPIRY_MINUTES =
  stockHoldMinutesAfterPaymentSessionOpened();

export function buildCashfreeOrderExpiryIso(
  now = Date.now(),
  sessionMinutes = CASHFREE_ORDER_EXPIRY_MINUTES,
): string {
  const minutes = Math.max(16, Math.round(sessionMinutes));
  // Cashfree examples use second precision (no ms).
  return new Date(now + minutes * 60_000)
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");
}
