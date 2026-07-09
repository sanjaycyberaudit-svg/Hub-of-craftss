import crypto from "crypto";
import {
  buildCashfreeOrderExpiryIso,
  PAYMENT_SESSION_HOLD_MINUTES,
} from "@/lib/orders/stock-reservation-policy";
import { getCashfreeConfig } from "@/lib/integrations/settings";
import { fetchWithTimeout } from "@/lib/network/fetchWithTimeout";
import {
  buildCashfreeNotifyUrl,
  buildCashfreeReturnUrl,
  getCashfreeHostedCheckoutUrl,
  validateCashfreeOrderAmount,
  validateCashfreeOrderId,
  validateCashfreeRuntimeConfig,
} from "@/lib/payments/cashfree-standards";
import { getCanonicalSiteOrigin } from "@/lib/auth/site-urls";
import { getURL } from "@/lib/utils";
import { normalizeIndianMobile } from "@/lib/payments/phonepe";

type CreateCashfreePaymentParams = {
  orderId: string;
  amountInRupees: number;
  customerName?: string | null;
  customerMobile?: string | null;
  customerEmail?: string | null;
  customerId?: string | null;
};

type CashfreeCreateOrderResponse = {
  cf_order_id?: string | number;
  order_id?: string;
  payment_session_id?: string;
  order_status?: string;
  message?: string;
  code?: string;
  type?: string;
};

type CashfreeFetchOrderResponse = {
  cf_order_id?: string | number;
  order_id?: string;
  order_status?: string;
  payment_session_id?: string;
  message?: string;
  code?: string;
  type?: string;
};

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

const CASHFREE_WEBHOOK_MAX_DRIFT_MS = 10 * 60 * 1000;
const CASHFREE_HTTP_TIMEOUT_MS = 12_000;

function signCashfreeWebhookPayload(
  rawBody: string,
  timestamp: string,
  secret: string,
) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}${rawBody}`)
    .digest("base64");
}

export async function createCashfreePayment(
  params: CreateCashfreePaymentParams,
) {
  const config = await getCashfreeConfig();
  if (!config) return null;

  const configError = validateCashfreeRuntimeConfig(config);
  if (configError) {
    throw new Error(configError);
  }

  const orderIdError = validateCashfreeOrderId(params.orderId);
  if (orderIdError) {
    throw new Error(orderIdError);
  }

  const amountError = validateCashfreeOrderAmount(params.amountInRupees);
  if (amountError) {
    throw new Error(amountError);
  }

  const phone = normalizeIndianMobile(params.customerMobile).replace(/^91/, "");
  const customerEmail = String(params.customerEmail ?? "").trim() || undefined;
  const customerName = String(params.customerName ?? "").trim() || undefined;
  const customerId =
    String(params.customerId ?? "").trim() || `guest_${params.orderId}`;
  const siteBaseUrl = getURL();
  const returnUrl = buildCashfreeReturnUrl(siteBaseUrl);
  const notifyUrl = buildCashfreeNotifyUrl(siteBaseUrl);

  const createOrderUrl = `${normalizeBaseUrl(config.baseUrl)}/orders`;
  const createOrderInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": config.clientId,
      "x-client-secret": config.clientSecret,
      "x-api-version": config.apiVersion,
    },
    body: JSON.stringify({
      order_id: params.orderId,
      order_amount: Number(params.amountInRupees.toFixed(2)),
      order_currency: "INR",
      order_expiry_time: buildCashfreeOrderExpiryIso(),
      customer_details: {
        customer_id: customerId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: phone || undefined,
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: notifyUrl,
      },
      order_note: `Order ${params.orderId}`,
    }),
    cache: "no-store",
  } satisfies RequestInit;

  // Cashfree can occasionally hang or return slow 5xx responses; enforce a
  // short timeout so checkout doesn't leave customers stuck on "pending".
  let res: Response | null = null;
  let data: CashfreeCreateOrderResponse | null = null;

  try {
    res = await fetchWithTimeout(createOrderUrl, {
      ...createOrderInit,
      timeoutMs: CASHFREE_HTTP_TIMEOUT_MS,
    });
    data = (await res
      .json()
      .catch(() => null)) as CashfreeCreateOrderResponse | null;
  } catch (error) {
    // One retry for transient network/timeout errors.
    res = await fetchWithTimeout(createOrderUrl, {
      ...createOrderInit,
      timeoutMs: CASHFREE_HTTP_TIMEOUT_MS,
    });
    data = (await res
      .json()
      .catch(() => null)) as CashfreeCreateOrderResponse | null;
  }

  if (!res.ok || !data?.payment_session_id) {
    // If the order exists already (idempotent order_id), try one status fetch to
    // recover the payment_session_id.
    try {
      const status = await fetchCashfreeOrderStatus(params.orderId);
      const sessionId = String(status.payment_session_id ?? "").trim();
      if (sessionId) {
        return {
          paymentSessionId: sessionId,
          cashfreeOrderId: String(status.order_id ?? params.orderId).trim(),
          cashfreeCfOrderId: status.cf_order_id
            ? String(status.cf_order_id)
            : null,
          environment: config.environment,
          returnUrl,
          checkoutOrigin: getCanonicalSiteOrigin(),
          hostedCheckoutUrl: getCashfreeHostedCheckoutUrl(config.environment),
        };
      }
    } catch {
      // Ignore recovery errors and fall through to the standard error.
    }

    const reason = String(
      data?.message || data?.type || data?.code || `HTTP_${res.status}`,
    ).trim();
    throw new Error(`Cashfree order creation failed: ${reason}`);
  }

  return {
    paymentSessionId: data.payment_session_id,
    cashfreeOrderId: String(data.order_id ?? params.orderId).trim(),
    cashfreeCfOrderId: data.cf_order_id ? String(data.cf_order_id) : null,
    environment: config.environment,
    returnUrl,
    checkoutOrigin: getCanonicalSiteOrigin(),
    hostedCheckoutUrl: getCashfreeHostedCheckoutUrl(config.environment),
  };
}

export async function fetchCashfreeOrderStatus(orderId: string) {
  const config = await getCashfreeConfig();
  if (!config) throw new Error("Cashfree config is not enabled");

  const res = await fetchWithTimeout(
    `${normalizeBaseUrl(config.baseUrl)}/orders/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": config.clientId,
        "x-client-secret": config.clientSecret,
        "x-api-version": config.apiVersion,
      },
      cache: "no-store",
      timeoutMs: CASHFREE_HTTP_TIMEOUT_MS,
    },
  );

  const data = (await res
    .json()
    .catch(() => null)) as CashfreeFetchOrderResponse | null;

  if (!res.ok || !data?.order_id) {
    const reason = String(
      data?.message || data?.type || data?.code || `HTTP_${res.status}`,
    ).trim();
    throw new Error(`Cashfree order status fetch failed: ${reason}`);
  }

  return data;
}

export async function verifyCashfreeWebhookSignature(params: {
  rawBody: string;
  timestamp: string;
  signature: string;
}) {
  const config = await getCashfreeConfig();
  if (!config) {
    throw new Error("Cashfree config is not enabled");
  }

  const ts = Number.parseInt(params.timestamp.trim(), 10);
  if (!Number.isFinite(ts)) return false;

  const now = Date.now();
  if (Math.abs(now - ts) > CASHFREE_WEBHOOK_MAX_DRIFT_MS) {
    return false;
  }

  const computed = signCashfreeWebhookPayload(
    params.rawBody,
    params.timestamp,
    config.clientSecret,
  );
  const provided = params.signature.trim();

  const computedBuffer = Buffer.from(computed);
  const providedBuffer = Buffer.from(provided);
  if (computedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedBuffer, providedBuffer);
}
