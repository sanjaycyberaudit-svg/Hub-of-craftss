import { createHash } from "node:crypto";

export type PaymentWebhookProvider = "phonepe" | "cashfree";

export function shortPayloadHash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

/**
 * PhonePe often retries the same callback body. Hash the verified payload so
 * exact duplicates skip; a later COMPLETED callback with different body still runs.
 */
export function phonePeWebhookEventKey(input: {
  merchantTransactionId: string;
  rawBody: string;
}): string {
  const merchant = String(input.merchantTransactionId ?? "").trim();
  return `${merchant}:${shortPayloadHash(input.rawBody)}`;
}

/**
 * Cashfree: prefer payment/order ids from payload; then dashboard
 * x-idempotency-key; fall back to body hash so retries collide while a new
 * payment does not.
 */
export function cashfreeWebhookEventKey(input: {
  orderId: string;
  webhookType?: string | null;
  paymentId?: string | null;
  rawBody: string;
  idempotencyKey?: string | null;
}): string {
  const orderId = String(input.orderId ?? "").trim();
  const type = String(input.webhookType ?? "webhook").trim() || "webhook";
  const paymentId = String(input.paymentId ?? "").trim();
  if (paymentId) return `${type}:${orderId}:${paymentId}`;
  const idempotencyKey = String(input.idempotencyKey ?? "").trim();
  if (idempotencyKey) return `${type}:${orderId}:idem:${idempotencyKey}`;
  return `${type}:${orderId}:${shortPayloadHash(input.rawBody)}`;
}
