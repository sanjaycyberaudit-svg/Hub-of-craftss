import {
  cashfreeCheckoutSessionSchema,
  getCashfreeHostedCheckoutUrl,
  readCashfreeCheckoutError,
  validatePaymentSessionId,
  type CashfreeCheckoutSessionPayload,
  type CashfreeEnvironment,
} from "@/lib/payments/cashfree-standards";

export {
  cashfreeCheckoutSessionSchema,
  readCashfreeCheckoutError,
  validatePaymentSessionId,
  type CashfreeCheckoutSessionPayload,
  type CashfreeEnvironment,
};

export const CASHFREE_CHECKOUT_STARTED_KEY_PREFIX = "cf_checkout_started:";

export function cashfreeCheckoutStartedKey(
  orderId: string,
  paymentSessionId: string,
): string {
  return `${CASHFREE_CHECKOUT_STARTED_KEY_PREFIX}${orderId}:${paymentSessionId}`;
}

export function hasCashfreeCheckoutStarted(
  orderId: string,
  paymentSessionId: string,
): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return Boolean(
    sessionStorage.getItem(
      cashfreeCheckoutStartedKey(orderId, paymentSessionId),
    ),
  );
}

export function markCashfreeCheckoutStarted(
  orderId: string,
  paymentSessionId: string,
): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(
    cashfreeCheckoutStartedKey(orderId, paymentSessionId),
    String(Date.now()),
  );
}

export function parseCashfreeCheckoutSessionPayload(
  payload: unknown,
): CashfreeCheckoutSessionPayload {
  const parsed = cashfreeCheckoutSessionSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Invalid Cashfree checkout response from server.");
  }
  return parsed.data;
}

export function buildClientCashfreeReturnUrl(origin: string): string {
  const normalized = origin.trim().replace(/\/$/, "");
  if (!normalized) {
    throw new Error("Cashfree return URL could not be built for this site.");
  }
  return `${normalized}/api/cashfree/redirect?order_id={order_id}`;
}

/** Mirrors Cashfree redirect checkout: one POST form to the hosted checkout URL. */
export function submitCashfreeHostedCheckoutForm(params: {
  paymentSessionId: string;
  returnUrl: string;
  environment: CashfreeEnvironment;
  hostedCheckoutUrl?: string;
  redirectTarget?: "_self" | "_blank" | "_top";
}): void {
  if (typeof document === "undefined") {
    throw new Error("Cashfree hosted checkout is only available in browser");
  }

  const action =
    params.hostedCheckoutUrl?.trim() ||
    getCashfreeHostedCheckoutUrl(params.environment);
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.target = params.redirectTarget ?? "_self";
  form.style.display = "none";

  const fields: Record<string, string> = {
    payment_session_id: params.paymentSessionId,
    return_url: params.returnUrl,
  };

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

/**
 * Opens Cashfree hosted checkout once. Uses a direct form POST (same as Cashfree
 * redirect checkout) instead of the JS SDK, which can leave UPI/Google Pay flows
 * pending and accidentally open a second checkout via timeout fallbacks.
 */
export function openCashfreeCheckout(params: {
  payload: CashfreeCheckoutSessionPayload;
}): void {
  const session = parseCashfreeCheckoutSessionPayload(params.payload);
  if (!validatePaymentSessionId(session.paymentSessionId)) {
    throw new Error("Invalid Cashfree payment session.");
  }

  const returnUrl = session.returnUrl.trim();
  if (!returnUrl) {
    throw new Error("Cashfree return URL missing from checkout session.");
  }

  if (hasCashfreeCheckoutStarted(session.orderId, session.paymentSessionId)) {
    return;
  }

  markCashfreeCheckoutStarted(session.orderId, session.paymentSessionId);

  submitCashfreeHostedCheckoutForm({
    paymentSessionId: session.paymentSessionId,
    returnUrl,
    environment: session.environment,
    hostedCheckoutUrl: session.hostedCheckoutUrl,
    redirectTarget: "_self",
  });
}
