import type {
  CashfreeConfig,
  PhonePeConfig,
} from "@/lib/integrations/settings";

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
    return params.phonePeConfig.environment;
  }

  return "sandbox";
}
