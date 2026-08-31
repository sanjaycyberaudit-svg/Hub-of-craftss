import { z } from "zod";

export const CASHFREE_SANDBOX_BASE_URL = "https://sandbox.cashfree.com/pg";
export const CASHFREE_PRODUCTION_BASE_URL = "https://api.cashfree.com/pg";

export const PHONEPE_PRODUCTION_AUTH_URL =
  "https://api.phonepe.com/apis/identity-manager/v1/oauth/token";
export const PHONEPE_SANDBOX_AUTH_URL =
  "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token";
export const PHONEPE_PRODUCTION_PAY_URL =
  "https://api.phonepe.com/apis/pg/checkout/v2/pay";
export const PHONEPE_SANDBOX_PAY_URL =
  "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay";
export const PHONEPE_PRODUCTION_STATUS_BASE =
  "https://api.phonepe.com/apis/pg/checkout/v2/order";
export const PHONEPE_SANDBOX_STATUS_BASE =
  "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order";

export function resolveCashfreeBaseUrl(params: {
  environment: "sandbox" | "production";
  baseUrl?: string | null;
}): string {
  const raw = String(params.baseUrl ?? "").trim();
  const normalized = raw.replace(/\/$/, "");
  const pointsToSandbox = normalized.includes("sandbox.cashfree.com");
  const pointsToProduction =
    normalized.includes("api.cashfree.com") ||
    normalized.includes("payments.cashfree.com");

  if (params.environment === "production") {
    if (!normalized || pointsToSandbox) {
      return CASHFREE_PRODUCTION_BASE_URL;
    }
    return normalized;
  }

  if (!normalized || pointsToProduction) {
    return CASHFREE_SANDBOX_BASE_URL;
  }

  return normalized;
}

export function resolvePhonePeEnvironment(
  raw?: string | null,
  baseUrlHint?: string | null,
): "sandbox" | "production" {
  const env = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (env === "production" || env === "prod" || env === "live") {
    return "production";
  }
  if (env === "sandbox" || env === "uat" || env === "test" || env === "preprod") {
    return "sandbox";
  }
  const hint = String(baseUrlHint ?? "").toLowerCase();
  if (hint.includes("preprod") || hint.includes("pg-sandbox")) {
    return "sandbox";
  }
  // Legacy hermes URL was production-only for older PG.
  if (hint.includes("api.phonepe.com")) return "production";
  return "production";
}

export function phonePeAuthUrl(environment: "sandbox" | "production") {
  return environment === "production"
    ? PHONEPE_PRODUCTION_AUTH_URL
    : PHONEPE_SANDBOX_AUTH_URL;
}

export function phonePePayUrl(environment: "sandbox" | "production") {
  return environment === "production"
    ? PHONEPE_PRODUCTION_PAY_URL
    : PHONEPE_SANDBOX_PAY_URL;
}

export function phonePeStatusBaseUrl(environment: "sandbox" | "production") {
  return environment === "production"
    ? PHONEPE_PRODUCTION_STATUS_BASE
    : PHONEPE_SANDBOX_STATUS_BASE;
}

export const cashfreePayloadSchema = z.object({
  clientId: z.string().trim().min(1),
  clientSecret: z.string().trim().min(1),
  baseUrl: z.string().trim().url(),
  apiVersion: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD API version format"),
  environment: z.enum(["sandbox", "production"]),
});

/** PhonePe Standard Checkout (OAuth) — Client ID / Version / Secret. */
export const phonepePayloadSchema = z.object({
  clientId: z.string().trim().min(1, "Client ID is required"),
  clientVersion: z.string().trim().min(1, "Client Version is required"),
  clientSecret: z.string().trim().min(1, "Client Secret is required"),
  environment: z.enum(["sandbox", "production"]),
});

export const whatsappPayloadSchema = z.object({
  accessToken: z.string().trim().min(1),
  phoneNumberId: z.string().trim().min(1),
  templateName: z.string().trim().optional(),
  templateLanguage: z.string().trim().min(2).default("en"),
  notifySeller: z.boolean().default(false),
  sellerMobiles: z.string().trim().default(""),
});

export function normalizeCashfreeIncoming(incoming: Record<string, unknown>) {
  const environment =
    String(incoming.environment ?? "sandbox")
      .trim()
      .toLowerCase() === "production"
      ? ("production" as const)
      : ("sandbox" as const);

  return {
    clientId: String(incoming.clientId ?? "").trim(),
    clientSecret: String(incoming.clientSecret ?? "").trim(),
    baseUrl: resolveCashfreeBaseUrl({
      environment,
      baseUrl: String(incoming.baseUrl ?? "").trim(),
    }),
    apiVersion: String(incoming.apiVersion ?? "").trim() || "2026-01-01",
    environment,
  };
}

/**
 * Accepts current PhonePe OAuth fields and legacy merchantId/saltKey/saltIndex
 * labels (merchants often paste Client ID into the old Merchant ID box).
 */
export function normalizePhonePeIncoming(incoming: Record<string, unknown>) {
  const clientId = String(
    incoming.clientId ?? incoming.merchantId ?? "",
  ).trim();
  const clientSecret = String(
    incoming.clientSecret ?? incoming.saltKey ?? "",
  ).trim();
  const clientVersion = String(
    incoming.clientVersion ?? incoming.saltIndex ?? "",
  ).trim();
  const environment = resolvePhonePeEnvironment(
    String(incoming.environment ?? ""),
    String(incoming.baseUrl ?? incoming.authUrl ?? incoming.payUrl ?? ""),
  );

  return {
    clientId,
    clientVersion,
    clientSecret,
    environment,
  };
}

export function normalizeWhatsAppIncoming(incoming: Record<string, unknown>) {
  return {
    accessToken: String(incoming.accessToken ?? "").trim(),
    phoneNumberId: String(incoming.phoneNumberId ?? "").trim(),
    templateName: String(incoming.templateName ?? "").trim(),
    templateLanguage:
      String(incoming.templateLanguage ?? "")
        .trim()
        .toLowerCase() || "en",
    notifySeller: Boolean(incoming.notifySeller ?? false),
    sellerMobiles: String(incoming.sellerMobiles ?? "").trim(),
  };
}

export function parseEnabledCashfreeValue(
  mergedValue: Record<string, unknown>,
) {
  return cashfreePayloadSchema.safeParse(mergedValue);
}

export function parseEnabledPhonePeValue(mergedValue: Record<string, unknown>) {
  return phonepePayloadSchema.safeParse(normalizePhonePeIncoming(mergedValue));
}

export function parseEnabledWhatsAppValue(
  mergedValue: Record<string, unknown>,
) {
  return whatsappPayloadSchema.safeParse(mergedValue);
}

/** Strict shape check only when a gateway is being enabled. */
export function parseIncomingCashfreeForEnable(
  incoming: Record<string, unknown>,
) {
  return cashfreePayloadSchema
    .partial({ clientSecret: true })
    .safeParse(normalizeCashfreeIncoming(incoming));
}

export function parseIncomingPhonePeForEnable(
  incoming: Record<string, unknown>,
) {
  return phonepePayloadSchema
    .partial({ clientSecret: true })
    .safeParse(normalizePhonePeIncoming(incoming));
}

export function parseIncomingWhatsAppForEnable(
  incoming: Record<string, unknown>,
) {
  return whatsappPayloadSchema
    .partial({ accessToken: true })
    .safeParse(normalizeWhatsAppIncoming(incoming));
}

export function formatZodErrorMessage(
  error: z.ZodError,
  fallback: string,
): string {
  const first = error.issues[0];
  if (!first) return fallback;
  const path = first.path.length ? `${first.path.join(".")}: ` : "";
  return `${fallback} (${path}${first.message})`;
}
