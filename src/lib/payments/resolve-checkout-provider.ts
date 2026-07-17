import type {
  CashfreeConfig,
  PhonePeConfig,
} from "@/lib/integrations/settings";

export type CheckoutPaymentProvider = "cashfree" | "phonepe";

/**
 * Checkout uses the single enabled Indian gateway. Cashfree wins if both were
 * ever enabled in legacy data. Returns null when no gateway is configured.
 */
export function resolveCheckoutPaymentProvider(input: {
  cashfreeConfig: CashfreeConfig | null;
  phonePeConfig: PhonePeConfig | null;
}): CheckoutPaymentProvider | null {
  if (input.cashfreeConfig) return "cashfree";
  if (input.phonePeConfig) return "phonepe";
  return null;
}

export function checkoutProviderLabel(
  provider: CheckoutPaymentProvider,
): string {
  switch (provider) {
    case "cashfree":
      return "Cashfree";
    case "phonepe":
      return "PhonePe";
    default:
      return "payment gateway";
  }
}
