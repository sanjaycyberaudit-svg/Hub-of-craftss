import { z } from "zod";
import {
  CASHFREE_PRODUCTION_BASE_URL,
  CASHFREE_SANDBOX_BASE_URL,
  resolveCashfreeBaseUrl,
} from "@/lib/integrations/payment-settings";

export const CASHFREE_DEFAULT_API_VERSION = "2025-01-01";
export const CASHFREE_SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";
export const CASHFREE_SANDBOX_HOSTED_CHECKOUT_URL =
  "https://sandbox.cashfree.com/pg/view/sessions/checkout";
export const CASHFREE_PRODUCTION_HOSTED_CHECKOUT_URL =
  "https://api.cashfree.com/pg/view/sessions/checkout";
export const PAYMENT_SESSION_ID_PATTERN = /^session_[A-Za-z0-9_-]+$/;
export const CASHFREE_API_VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type CashfreeEnvironment = "sandbox" | "production";

export type CashfreeRuntimeConfig = {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  apiVersion: string;
  environment: CashfreeEnvironment;
};

export const cashfreeCheckoutSessionSchema = z.object({
  provider: z.literal("cashfree"),
  orderId: z.string().trim().min(1),
  paymentSessionId: z
    .string()
    .trim()
    .regex(PAYMENT_SESSION_ID_PATTERN, "Invalid Cashfree payment session"),
  environment: z.enum(["sandbox", "production"]),
  returnUrl: z.string().url(),
  checkoutOrigin: z.string().url(),
  hostedCheckoutUrl: z.string().url().optional(),
  accessToken: z.string().trim().min(1).optional(),
});

export type CashfreeCheckoutSessionPayload = z.infer<
  typeof cashfreeCheckoutSessionSchema
>;

function normalizeHttpsBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, "");
  if (!trimmed) return trimmed;
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

export function buildCashfreeReturnUrl(siteBaseUrl: string): string {
  return `${normalizeHttpsBaseUrl(siteBaseUrl)}api/cashfree/redirect?order_id={order_id}`;
}

export function buildCashfreeNotifyUrl(siteBaseUrl: string): string {
  return `${normalizeHttpsBaseUrl(siteBaseUrl)}api/cashfree/webhook`;
}

export function getCashfreeHostedCheckoutUrl(
  environment: CashfreeEnvironment,
): string {
  return environment === "production"
    ? CASHFREE_PRODUCTION_HOSTED_CHECKOUT_URL
    : CASHFREE_SANDBOX_HOSTED_CHECKOUT_URL;
}

export function validatePaymentSessionId(
  paymentSessionId: string | null | undefined,
): boolean {
  return PAYMENT_SESSION_ID_PATTERN.test(String(paymentSessionId ?? "").trim());
}

export function validateCashfreeApiVersion(
  apiVersion: string | null | undefined,
): boolean {
  return CASHFREE_API_VERSION_PATTERN.test(String(apiVersion ?? "").trim());
}

export function looksLikeProductionCashfreeCredential(
  clientId: string,
  clientSecret: string,
): boolean {
  const id = clientId.trim().toLowerCase();
  const secret = clientSecret.trim().toLowerCase();
  if (secret.includes("_prod_") || secret.includes("prod_")) return true;
  if (id.startsWith("test_") || id.includes("_test_")) return false;
  return !id.startsWith("cf_test") && !secret.includes("_test_");
}

export function looksLikeSandboxCashfreeCredential(
  clientId: string,
  clientSecret: string,
): boolean {
  const id = clientId.trim().toLowerCase();
  const secret = clientSecret.trim().toLowerCase();
  if (id.startsWith("test_") || id.includes("_test_")) return true;
  if (secret.includes("_test_") || secret.includes("sandbox")) return true;
  return !looksLikeProductionCashfreeCredential(clientId, clientSecret);
}

export function validateCashfreeCredentialEnvironment(params: {
  clientId: string;
  clientSecret: string;
  environment: CashfreeEnvironment;
}): string | null {
  const { clientId, clientSecret, environment } = params;
  if (!clientId.trim() || !clientSecret.trim()) {
    return "Cashfree Client ID and Client Secret are required.";
  }

  const productionCredential = looksLikeProductionCashfreeCredential(
    clientId,
    clientSecret,
  );
  const sandboxCredential = looksLikeSandboxCashfreeCredential(
    clientId,
    clientSecret,
  );

  if (
    environment === "production" &&
    sandboxCredential &&
    !productionCredential
  ) {
    return "Production mode requires live Cashfree credentials, not sandbox/test keys.";
  }

  if (environment === "sandbox" && productionCredential && !sandboxCredential) {
    return "Sandbox mode requires test Cashfree credentials, not live production keys.";
  }

  return null;
}

export function validateCashfreeRuntimeConfig(
  config: CashfreeRuntimeConfig,
): string | null {
  if (!config.clientId.trim() || !config.clientSecret.trim()) {
    return "Cashfree is enabled but credentials are missing.";
  }

  if (!validateCashfreeApiVersion(config.apiVersion)) {
    return "Cashfree API version must use YYYY-MM-DD format (for example 2025-01-01).";
  }

  const resolvedBaseUrl = resolveCashfreeBaseUrl({
    environment: config.environment,
    baseUrl: config.baseUrl,
  });

  if (
    config.environment === "production" &&
    resolvedBaseUrl !== CASHFREE_PRODUCTION_BASE_URL
  ) {
    return "Production Cashfree must use https://api.cashfree.com/pg as the base URL.";
  }

  if (
    config.environment === "sandbox" &&
    !resolvedBaseUrl.includes("sandbox.cashfree.com")
  ) {
    return "Sandbox Cashfree must use https://sandbox.cashfree.com/pg as the base URL.";
  }

  return validateCashfreeCredentialEnvironment({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    environment: config.environment,
  });
}

export function validateCashfreeOrderAmount(
  amountInRupees: number,
): string | null {
  if (!Number.isFinite(amountInRupees) || amountInRupees < 1) {
    return "Order amount must be at least ₹1.";
  }
  return null;
}

export function validateCashfreeOrderId(orderId: string): string | null {
  const normalized = orderId.trim();
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(normalized)) {
    return "Invalid Cashfree order id.";
  }
  return null;
}

export function readCashfreeCheckoutError(
  result:
    | {
        error?: { message?: string; type?: string };
        redirect?: boolean;
      }
    | null
    | undefined,
  options?: { whitelistOrigin?: string },
): string | null {
  const message = String(result?.error?.message ?? "").trim();
  if (!message) return null;

  const normalized = message.toLowerCase();
  const whitelistHint = options?.whitelistOrigin
    ? ` Add ${options.whitelistOrigin} under Cashfree Dashboard → Developers → Whitelisting.`
    : " Whitelist your storefront domain under Cashfree Dashboard → Developers → Whitelisting.";

  if (
    normalized.includes("whitelist") ||
    normalized.includes("domain") ||
    normalized.includes("not allowed")
  ) {
    return `${message}.${whitelistHint}`;
  }

  return message;
}
