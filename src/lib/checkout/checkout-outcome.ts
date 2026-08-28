import { readPaymentMeta } from "@/lib/orders/payment-meta";

export const CHECKOUT_TELEMETRY_EVENT_TYPES = [
  "checkout_session_failed",
  "cashfree_checkout_opened",
  "payment_cancelled",
  "payment_failed",
  "cashfree_script_failed",
  "verify_failed",
  "verify_held",
  "payment_confirmed",
  "cashfree_webhook_failed",
] as const;

export type CheckoutTelemetryEventType =
  (typeof CHECKOUT_TELEMETRY_EVENT_TYPES)[number];

export type CheckoutTelemetryEvent = {
  at: string;
  type: CheckoutTelemetryEventType;
  reason: string | null;
  source: "client" | "server";
};

export type CheckoutTelemetryState = {
  lastEvent: CheckoutTelemetryEventType;
  lastReason: string | null;
  lastAt: string;
  events: CheckoutTelemetryEvent[];
};

export type CheckoutOutcomeKind =
  | "payment_failed"
  | "payment_cancelled"
  | "checkout_error"
  | "abandoned"
  | "in_progress"
  | "unknown";

export type CheckoutOutcome = {
  kind: CheckoutOutcomeKind;
  label: string;
  detail: string | null;
};

export function readCheckoutTelemetry(
  paymentMeta: unknown,
): CheckoutTelemetryState | null {
  const meta = readPaymentMeta(paymentMeta);
  const raw = meta.checkoutTelemetry;
  if (!raw || typeof raw !== "object") return null;

  const record = raw as Record<string, unknown>;
  const lastEvent = String(record.lastEvent ?? "").trim();
  if (
    !CHECKOUT_TELEMETRY_EVENT_TYPES.includes(
      lastEvent as CheckoutTelemetryEventType,
    )
  ) {
    return null;
  }

  const events = Array.isArray(record.events)
    ? record.events
        .map((entry) => normalizeTelemetryEvent(entry))
        .filter((entry): entry is CheckoutTelemetryEvent => entry !== null)
    : [];

  return {
    lastEvent: lastEvent as CheckoutTelemetryEventType,
    lastReason:
      typeof record.lastReason === "string" ? record.lastReason : null,
    lastAt: String(record.lastAt ?? ""),
    events,
  };
}

function normalizeTelemetryEvent(
  value: unknown,
): CheckoutTelemetryEvent | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const type = String(record.type ?? "").trim();
  if (
    !CHECKOUT_TELEMETRY_EVENT_TYPES.includes(type as CheckoutTelemetryEventType)
  ) {
    return null;
  }

  return {
    at: String(record.at ?? ""),
    type: type as CheckoutTelemetryEventType,
    reason:
      typeof record.reason === "string" && record.reason.trim()
        ? record.reason.trim()
        : null,
    source: record.source === "server" ? "server" : "client",
  };
}

function outcomeFromTelemetryEvent(
  event: CheckoutTelemetryEventType,
  reason: string | null,
): CheckoutOutcome {
  switch (event) {
    case "payment_failed":
    case "cashfree_webhook_failed":
      return {
        kind: "payment_failed",
        label: "Payment failed",
        detail: reason ?? "Bank or UPI declined the payment.",
      };
    case "payment_cancelled":
      return {
        kind: "payment_cancelled",
        label: "Cancelled",
        detail: reason ?? "Customer left Cashfree checkout.",
      };
    case "cashfree_script_failed":
    case "checkout_session_failed":
    case "verify_failed":
    case "verify_held":
      return {
        kind: "checkout_error",
        label: "Checkout error",
        detail: reason ?? "Payment could not be completed.",
      };
    case "cashfree_checkout_opened":
      return {
        kind: "in_progress",
        label: "Payment opened",
        detail: reason ?? "Cashfree opened; no outcome recorded yet.",
      };
    case "payment_confirmed":
      return {
        kind: "unknown",
        label: "Confirmed",
        detail: reason,
      };
    default:
      return {
        kind: "unknown",
        label: "Unknown",
        detail: reason,
      };
  }
}

/** Best label for unpaid admin rows — telemetry first, then Cashfree sync meta. */
export function resolveCheckoutOutcome(input: {
  paymentStatus: string;
  paymentMeta: unknown;
}): CheckoutOutcome | null {
  const paymentStatus = input.paymentStatus.trim().toLowerCase();
  if (["paid", "success", "captured"].includes(paymentStatus)) {
    return null;
  }

  const meta = readPaymentMeta(input.paymentMeta);
  const telemetry = readCheckoutTelemetry(meta);
  if (telemetry) {
    return outcomeFromTelemetryEvent(telemetry.lastEvent, telemetry.lastReason);
  }

  if (meta.amountMismatch) {
    return {
      kind: "checkout_error",
      label: "Held for review",
      detail: "Gateway amount did not match the order total.",
    };
  }

  const cashfreeOrderStatus = String(meta.cashfreeOrderStatus ?? "")
    .trim()
    .toUpperCase();

  if (["EXPIRED", "TERMINATED", "CANCELLED"].includes(cashfreeOrderStatus)) {
    return {
      kind: "payment_failed",
      label: "Payment failed",
      detail: `Cashfree order status: ${cashfreeOrderStatus}`,
    };
  }

  if (cashfreeOrderStatus === "ACTIVE") {
    return {
      kind: "abandoned",
      label: "Abandoned",
      detail: "Opened Cashfree but did not complete payment.",
    };
  }

  return {
    kind: "unknown",
    label: "No payment",
    detail: "Checkout started; outcome not recorded yet.",
  };
}

export function classifyCheckoutError(err: unknown): {
  type: CheckoutTelemetryEventType;
  reason: string;
} {
  const message = (
    err instanceof Error ? err.message : String(err ?? "")
  ).trim();

  if (/payment cancelled/i.test(message)) {
    return { type: "payment_cancelled", reason: message };
  }

  if (/invalid cashfree|cashfree checkout/i.test(message)) {
    return {
      type: "cashfree_script_failed",
      reason: message,
    };
  }

  if (/could not confirm cashfree payment|verify/i.test(message)) {
    return { type: "verify_failed", reason: message };
  }

  if (/held for review|amount mismatch/i.test(message)) {
    return { type: "verify_held", reason: message };
  }

  if (/cashfree payment failed|payment failed/i.test(message)) {
    return { type: "payment_failed", reason: message };
  }

  return {
    type: "checkout_session_failed",
    reason: message || "Checkout failed.",
  };
}
