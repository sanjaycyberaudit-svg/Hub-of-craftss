import crypto from "crypto";
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

type PhonePePayResponse = {
  success: boolean;
  code?: string;
  message?: string;
  data?: {
    merchantId?: string;
    merchantTransactionId?: string;
    instrumentResponse?: {
      type?: string;
      redirectInfo?: {
        url?: string;
        method?: string;
      };
    };
  };
};

type PhonePeStatusResponse = {
  success: boolean;
  code?: string;
  message?: string;
  data?: {
    merchantId?: string;
    merchantTransactionId?: string;
    transactionId?: string;
    amount?: number;
    state?: "COMPLETED" | "FAILED" | "PENDING";
    responseCode?: string;
    paymentInstrument?: {
      type?: string;
      utr?: string;
    };
  };
};

const PAY_ENDPOINT = "/pg/v1/pay";
const STATUS_ENDPOINT_PREFIX = "/pg/v1/status";
const PHONEPE_HTTP_TIMEOUT_MS = 12_000;

function sha256Hex(content: string) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

export function normalizeIndianMobile(mobile?: string | null) {
  const digits = String(mobile ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return "";
}

function toPaise(amountInRupees: number) {
  return Math.round(amountInRupees * 100);
}

export async function createPhonePePayment(params: CreatePhonePePaymentParams) {
  const config = await getPhonePeConfig();
  if (!config) return null;

  const merchantTransactionId = `ORD_${params.orderId}_${Date.now()}`;
  const merchantUserId =
    `${config.merchantUserIdPrefix || "USR"}_${params.orderId}`.slice(0, 35);

  const redirectParams = new URLSearchParams({ orderId: params.orderId });
  if (params.accessToken) {
    redirectParams.set("token", params.accessToken);
  }

  const payload = {
    merchantId: config.merchantId,
    merchantTransactionId,
    merchantUserId,
    amount: toPaise(params.amountInRupees),
    redirectUrl: `${getURL()}api/phonepe/redirect?${redirectParams.toString()}`,
    redirectMode: "REDIRECT",
    callbackUrl: `${getURL()}api/phonepe/webhook`,
    mobileNumber: normalizeIndianMobile(params.customerMobile),
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  const verifyRaw = `${payloadBase64}${PAY_ENDPOINT}${config.saltKey}`;
  const xVerify = `${sha256Hex(verifyRaw)}###${config.saltIndex}`;

  const payUrl = `${normalizeBaseUrl(config.baseUrl)}${PAY_ENDPOINT}`;
  const res = await fetchWithTimeout(payUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-VERIFY": xVerify,
      accept: "application/json",
    },
    body: JSON.stringify({ request: payloadBase64 }),
    cache: "no-store",
    timeoutMs: PHONEPE_HTTP_TIMEOUT_MS,
  });

  const data = (await res
    .json()
    .catch(() => null)) as PhonePePayResponse | null;

  if (!res.ok || !data?.success) {
    const reason = data?.message || data?.code || "PhonePe payment failed";
    throw new Error(reason);
  }

  const redirectUrl = data?.data?.instrumentResponse?.redirectInfo?.url;
  if (!redirectUrl) {
    throw new Error("PhonePe redirect URL missing from response");
  }

  return {
    redirectUrl,
    merchantTransactionId,
  };
}

export async function fetchPhonePePaymentStatus(merchantTransactionId: string) {
  const config = await getPhonePeConfig();
  if (!config) throw new Error("PhonePe config is not enabled");

  const statusPath = `${STATUS_ENDPOINT_PREFIX}/${config.merchantId}/${merchantTransactionId}`;
  const verifyRaw = `${statusPath}${config.saltKey}`;
  const xVerify = `${sha256Hex(verifyRaw)}###${config.saltIndex}`;

  const res = await fetchWithTimeout(
    `${normalizeBaseUrl(config.baseUrl)}${statusPath}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify,
        "X-MERCHANT-ID": config.merchantId,
        accept: "application/json",
      },
      cache: "no-store",
      timeoutMs: PHONEPE_HTTP_TIMEOUT_MS,
    },
  );

  const data = (await res
    .json()
    .catch(() => null)) as PhonePeStatusResponse | null;

  if (!res.ok || !data?.success) {
    const reason = data?.message || data?.code || "PhonePe status check failed";
    throw new Error(reason);
  }

  return data.data;
}

export function verifyPhonePeWebhookSignature(params: {
  base64Response: string;
  signature: string;
  saltKey: string;
  saltIndex: string;
}): boolean {
  const response = params.base64Response.trim();
  const provided = params.signature.trim();
  if (!response || !provided) return false;

  const expectedHash = sha256Hex(`${response}${params.saltKey}`);
  const expected = `${expectedHash}###${params.saltIndex}`;

  try {
    if (expected.length !== provided.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}
