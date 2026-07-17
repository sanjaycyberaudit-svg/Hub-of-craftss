/**
 * Gateway amount verification before marking an order paid.
 *
 * If the gateway reports a different amount than what we stored on the order,
 * we must NOT auto-mark the order paid (industry standard: hold for manual
 * review instead of shipping goods for an under-paid order).
 */

const AMOUNT_TOLERANCE_RUPEES = 0.01;

export type AmountCheckResult = {
  mismatch: boolean;
  expected: number | null;
  actual: number | null;
};

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(num) ? num : null;
}

/**
 * Compares the order amount stored in our DB with the amount reported by the
 * payment gateway (both in rupees). Only flags a mismatch when BOTH values
 * are present and differ beyond rounding tolerance — if the gateway omits the
 * amount we cannot verify, so we do not block the payment.
 */
export function detectPaidAmountMismatch(
  orderAmount: string | number | null | undefined,
  gatewayAmountRupees: number | null | undefined,
): AmountCheckResult {
  const expected = toFiniteNumber(orderAmount);
  const actual = toFiniteNumber(gatewayAmountRupees);

  if (expected === null || actual === null) {
    return { mismatch: false, expected, actual };
  }

  return {
    mismatch: Math.abs(expected - actual) > AMOUNT_TOLERANCE_RUPEES,
    expected,
    actual,
  };
}
