import crypto from "crypto";
import {
  phonePeAuthUrl,
  phonePePayUrl,
  phonePeStatusBaseUrl,
} from "@/lib/integrations/payment-settings";
import { getPhonePeConfig } from "@/lib/integrations/settings";
import { fetchWithTimeout } from "@/lib/network/fetchWithTimeout";
import { getURL } from "@/lib/utils";

type CreatePhonePePaymentParams = {
  orderId: string;
  amountInRupees: number;
  customerMobile?: string | null;
  customerEmail?: string | null;
  accessToken?: string;
};

type PhonePeTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_at?: number;
  message?: string;
  code?: string;
};

type PhonePePayResponse = {
  orderId?: string;
  state?: string;
  redirectUrl?: string;
  message?: string;
  code?: string;
};

type PhonePeStatusResponse = {
  orderId?: string;
  state?: string;
  amount?: number;
  paymentDetails?: Array<{
    transactionId?: string;
    state?: string;
    amount?: number;
    paymentMode?: string;
  }>;
  message?: string;
  code?: string;
};

const PHONEPE_HTTP_TIMEOUT_MS = 12_000;

type CachedToken = {
  token: string;
  expiresAtMs: number;
};

let cachedToken: CachedToken | null = null;

function sha256Hex(content: string) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function normalizeIndianMobile(mobile?: string | null) {
  let digits = String(mobile ?? "").replace(/\D/g, "");
  if (digits.startsWith("0091")) digits = digits.slice(4);
  else if (digits.startsWith("091")) digits = digits.slice(3);
  else if (digits.length === 11 && digits.startsWith("0"))
    digits = digits.slice(1);
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return "";
}

function toPaise(amountInRupees: number) {
  return Math.round(amountInRupees * 100);
}

function buildMerchantOrderId(orderId: string) {
  // PhonePe: max 63 chars, only _ and - as special chars.
  const raw = `ORD_${orderId}`.replace(/[^A-Za-z0-9_-]/g, "");
  return raw.slice(0, 63);
}

async function getPhonePeAccessToken(): Promise<string> {
  const config = await getPhonePeConfig();
  if (!config) throw new Error("PhonePe config is not enabled");

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs > now + 60_000) {
    return cachedToken.token;
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_version: config.clientVersion,
    client_secret: config.clientSecret,
    grant_type: "client_credentials",
  });

  const res = await fetchWithTimeout(phonePeAuthUrl(config.environment), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
    timeoutMs: PHONEPE_HTTP_TIMEOUT_MS,
  });

  const data = (await res.json().catch(() => null)) as PhonePeTokenResponse | null;
  const token = String(data?.access_token ?? "").trim();
  if (!res.ok || !token) {
    const reason = String(data?.message || data?.code || `HTTP_${res.status}`);
    throw new Error(`PhonePe auth failed: ${reason}`);
  }

  const expiresAtSec = Number(data?.expires_at ?? 0);
  cachedToken = {
    token,
    expiresAtMs:
      Number.isFinite(expiresAtSec) && expiresAtSec > 0
        ? expiresAtSec * 1000
        : now + 10 * 60_000,
  };

  return token;
}

export async function createPhonePePayment(params: CreatePhonePePaymentParams) {
  const config = await getPhonePeConfig();
  if (!config) return null;

  const merchantOrderId = buildMerchantOrderId(params.orderId);
  const token = await getPhonePeAccessToken();

  const redirectParams = new URLSearchParams({ orderId: params.orderId });
  if (params.accessToken) {
    redirectParams.set("token", params.accessToken);
  }
  const redirectUrl = `${getURL()}api/phonepe/redirect?${redirectParams.toString()}`;

  const payload = {
    merchantOrderId,
    amount: toPaise(params.amountInRupees),
    expireAfter: 1200,
    metaInfo: {
      udf1: params.orderId,
      udf2: normalizeIndianMobile(params.customerMobile).slice(0, 50) || undefined,
      udf3: String(params.customerEmail ?? "").trim().slice(0, 50) || undefined,
    },
    paymentFlow: {
      type: "PG_CHECKOUT",
      merchantUrls: {
        redirectUrl,
      },
    },
  };

  const res = await fetchWithTimeout(phonePePayUrl(config.environment), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `O-Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    timeoutMs: PHONEPE_HTTP_TIMEOUT_MS,
  });

  const data = (await res.json().catch(() => null)) as PhonePePayResponse | null;
  const checkoutUrl = String(data?.redirectUrl ?? "").trim();
  if (!res.ok || !checkoutUrl) {
    const reason = String(data?.message || data?.code || `HTTP_${res.status}`);
    throw new Error(`PhonePe payment failed: ${reason}`);
  }

  return {
    redirectUrl: checkoutUrl,
    merchantTransactionId: merchantOrderId,
    phonepeOrderId: String(data?.orderId ?? "").trim() || null,
  };
}

export async function fetchPhonePePaymentStatus(merchantOrderId: string) {
  const config = await getPhonePeConfig();
  if (!config) throw new Error("PhonePe config is not enabled");

  const token = await getPhonePeAccessToken();
  const statusUrl = `${phonePeStatusBaseUrl(config.environment)}/${encodeURIComponent(merchantOrderId)}/status?details=false`;

  const res = await fetchWithTimeout(statusUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `O-Bearer ${token}`,
    },
    cache: "no-store",
    timeoutMs: PHONEPE_HTTP_TIMEOUT_MS,
  });

  const data = (await res
    .json()
    .catch(() => null)) as PhonePeStatusResponse | null;

  if (!res.ok || !data?.state) {
    const reason = String(data?.message || data?.code || `HTTP_${res.status}`);
    throw new Error(`PhonePe status check failed: ${reason}`);
  }

  const latest = data.paymentDetails?.[0];
  return {
    state: data.state,
    amount: data.amount,
    transactionId: latest?.transactionId ?? data.orderId ?? null,
    responseCode: data.code ?? null,
    paymentInstrument: latest
      ? { type: latest.paymentMode ?? null }
      : null,
  };
}

/** Legacy salt webhook verify (older PhonePe PG). New OAuth callbacks rely on status API. */
export function verifyPhonePeWebhookSignature(params: {
  base64Response: string;
  signature: string;
  saltKey: string;
  saltIndex: string;
}): boolean {
  const response = params.base64Response.trim();
  const provided = params.signature.trim();
  if (!response || !provided || !params.saltKey.trim()) return false;

  const expectedHash = sha256Hex(`${response}${params.saltKey}`);
  const expected = `${expectedHash}###${params.saltIndex}`;

  try {
    if (expected.length !== provided.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}
