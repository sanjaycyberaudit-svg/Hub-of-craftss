/**
 * Cashfree webhook payload helpers.
 * Shape reference: https://www.cashfree.com/docs/api-reference/payments/latest/payments/webhooks
 */

function asTrimmedId(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

/** Payment lifecycle events that must carry an order_id per Cashfree docs. */
const ORDER_LIFECYCLE_WEBHOOK_TYPES = new Set([
  "PAYMENT_SUCCESS_WEBHOOK",
  "PAYMENT_FAILED_WEBHOOK",
  "PAYMENT_USER_DROPPED_WEBHOOK",
  "PAYMENT_SUCCESS",
  "PAYMENT_FAILED",
  "PAYMENT_USER_DROPPED",
]);

export function getCashfreeWebhookType(
  body: Record<string, unknown>,
): string {
  return String(body.type ?? body.event ?? "webhook").trim() || "webhook";
}

export function isCashfreeOrderLifecycleWebhook(type: string): boolean {
  const normalized = type.trim().toUpperCase();
  if (ORDER_LIFECYCLE_WEBHOOK_TYPES.has(normalized)) return true;
  return normalized.includes("PAYMENT_");
}

/**
 * Extract merchant order_id from known Cashfree payload shapes
 * (2023 / 2025 / 2026 webhook versions).
 */
export function extractCashfreeWebhookOrderId(
  body: Record<string, unknown>,
): string {
  const data = asRecord(body.data);
  const order = asRecord(data?.order);
  const payment = asRecord(data?.payment);

  return (
    asTrimmedId(order?.order_id) ||
    asTrimmedId(data?.order_id) ||
    asTrimmedId(payment?.order_id) ||
    asTrimmedId(body.order_id) ||
    asTrimmedId(body.orderId) ||
    ""
  );
}

export function extractCashfreeWebhookPaymentId(
  body: Record<string, unknown>,
): string {
  const data = asRecord(body.data);
  const payment = asRecord(data?.payment);

  return (
    asTrimmedId(payment?.cf_payment_id) ||
    asTrimmedId(payment?.payment_id) ||
    asTrimmedId(data?.cf_payment_id) ||
    asTrimmedId(data?.payment_id) ||
    ""
  );
}

export type MissingOrderIdDecision =
  | { action: "retry"; reason: "payment_webhook_missing_order_id" }
  | { action: "skip"; reason: "non_order_webhook" };

/**
 * Payment webhooks without order_id must not be ack'd as success — Cashfree
 * should retry. Non-order noise can be skipped with 200.
 */
export function decideMissingCashfreeOrderId(
  webhookType: string,
): MissingOrderIdDecision {
  if (isCashfreeOrderLifecycleWebhook(webhookType)) {
    return {
      action: "retry",
      reason: "payment_webhook_missing_order_id",
    };
  }
  return { action: "skip", reason: "non_order_webhook" };
}

/**
 * Cashfree timestamps are milliseconds (e.g. 1746427759733). Older samples
 * may send seconds — normalize before replay-window checks.
 */
export function parseCashfreeWebhookTimestampMs(
  timestamp: string,
): number | null {
  const raw = Number.parseInt(timestamp.trim(), 10);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return raw < 1e12 ? raw * 1000 : raw;
}

/**
 * Secrets used to verify HMAC. Env override first (rotation / Vercel), then
 * Cashfree PG client secret from admin config (docs default).
 */
export function resolveCashfreeWebhookSecrets(clientSecret: string): string[] {
  const secrets: string[] = [];
  const push = (value: string | undefined | null) => {
    const trimmed = String(value ?? "").trim();
    if (trimmed && !secrets.includes(trimmed)) secrets.push(trimmed);
  };

  push(process.env.CASHFREE_WEBHOOK_SECRET);
  push(process.env.CASHFREE_CLIENT_SECRET);
  push(clientSecret);
  return secrets;
}
