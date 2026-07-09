import type {
  CashfreeConfig,
  PhonePeConfig,
} from "@/lib/integrations/settings";

export type CheckoutPaymentProvider = "cashfree" | "phonepe" | "stripe";

/**
 * Checkout uses the single enabled Indian gateway. Cashfree wins if both were
 * ever enabled in legacy data.
 */
export function resolveCheckoutPaymentProvider(input: {
  cashfreeConfig: CashfreeConfig | null;
  phonePeConfig: PhonePeConfig | null;
}): CheckoutPaymentProvider {
  if (input.cashfreeConfig) return "cashfree";
  if (input.phonePeConfig) return "phonepe";
  return "stripe";
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
      return "Stripe";
  }
}
