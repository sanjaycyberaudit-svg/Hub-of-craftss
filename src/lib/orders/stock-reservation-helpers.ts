import {
  STOCK_HOLD_ORPHAN_FALLBACK_MINUTES,
  STOCK_HOLD_PRE_PAYMENT_MINUTES,
  resolveStockHoldTtlMinutes,
  stockHoldMinutesAfterPaymentSessionOpened,
} from "@/lib/orders/stock-reservation-policy";

/** @deprecated Use stock-reservation-policy constants; kept for tests/imports. */
export const STOCK_RESERVATION_TTL_MINUTES =
  stockHoldMinutesAfterPaymentSessionOpened();

export type StockReservationLine = {
  productId: string;
  quantity: number;
  size?: string;
};

export function shouldReserveStockAtCheckout(
  paymentEnvironment: "sandbox" | "production",
): boolean {
  return paymentEnvironment === "production";
}

export function buildReservationExpiryIso(
  now = Date.now(),
  ttlMinutes = stockHoldMinutesAfterPaymentSessionOpened(),
): string {
  return new Date(now + ttlMinutes * 60_000).toISOString();
}

export function readReservationLines(
  meta: Record<string, unknown>,
): StockReservationLine[] {
  const raw = meta.stockReservationLines;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const row = item as Record<string, unknown>;
      const productId = String(row.productId ?? "").trim();
      const quantity = Number(row.quantity ?? 0);
      const size = String(row.size ?? "")
        .trim()
        .toUpperCase();
      if (!productId || quantity <= 0) return null;
      return {
        productId,
        quantity,
        ...(size ? { size } : {}),
      } satisfies StockReservationLine;
    })
    .filter((line): line is StockReservationLine => line !== null);
}

export function isReservationExpired(
  meta: Record<string, unknown>,
  now = Date.now(),
): boolean {
  const expiresAt = String(meta.stockReservationExpiresAt ?? "").trim();
  if (!expiresAt) return false;
  const expiresMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresMs)) return false;
  return expiresMs <= now;
}

export function hasActiveStockReservation(
  meta: Record<string, unknown>,
): boolean {
  if (meta.inventoryFulfilled === true) return false;
  if (meta.stockReservationConsumed === true) return false;

  return (
    meta.stockReserved === true &&
    meta.stockReleased !== true &&
    readReservationLines(meta).length > 0
  );
}

const ORPHAN_RELEASE_IMMEDIATE_REASONS = new Set([
  "checkout_failed",
  "payment_failed",
  "payment_canceled",
]);

/** Unpaid production checkout where stock was held but reservation meta is missing. */
export function canReleaseOrphanUnpaidHold(
  meta: Record<string, unknown>,
  createdAt: string | Date | null | undefined,
  reason: string,
  now = Date.now(),
): boolean {
  if (meta.stockReleased === true) return false;
  if (meta.inventoryFulfilled === true) return false;
  if (meta.stockReservationConsumed === true) return false;
  if (String(meta.paymentEnvironment ?? "").trim() !== "production") {
    return false;
  }
  if (hasActiveStockReservation(meta)) return false;

  if (ORPHAN_RELEASE_IMMEDIATE_REASONS.has(reason)) return true;

  const ttlMinutes = resolveStockHoldTtlMinutes(meta);
  const createdValue =
    createdAt instanceof Date
      ? createdAt.toISOString()
      : String(createdAt ?? "");
  const createdMs = Date.parse(createdValue.trim());
  if (!Number.isFinite(createdMs)) return false;

  const orphanFallbackMinutes = Math.max(
    ttlMinutes,
    STOCK_HOLD_ORPHAN_FALLBACK_MINUTES,
  );

  return createdMs + orphanFallbackMinutes * 60_000 <= now;
}
