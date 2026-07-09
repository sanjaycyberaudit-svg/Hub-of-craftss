import type {
  CashfreeConfig,
  PhonePeConfig,
} from "@/lib/integrations/settings";

function isProductionStripeKey(secretKey: string | undefined) {
  return Boolean(secretKey?.startsWith("sk_live_"));
}

export function resolveCheckoutPaymentEnvironment(params: {
  preferCashfree: boolean;
  preferPhonePe: boolean;
  cashfreeConfig: CashfreeConfig | null;
  phonePeConfig: PhonePeConfig | null;
}): "sandbox" | "production" {
  if (params.preferCashfree && params.cashfreeConfig) {
    return params.cashfreeConfig.environment;
  }

  if (params.preferPhonePe && params.phonePeConfig) {
    const baseUrl = params.phonePeConfig.baseUrl.toLowerCase();
    if (
      baseUrl.includes("sandbox") ||
      baseUrl.includes("preprod") ||
      baseUrl.includes("uat")
    ) {
      return "sandbox";
    }
    return "production";
  }

  return isProductionStripeKey(process.env.STRIPE_SECRET_KEY)
    ? "production"
    : "sandbox";
}

export function isProductionStripePaymentsEnabled() {
  return isProductionStripeKey(process.env.STRIPE_SECRET_KEY);
}
