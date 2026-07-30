import type {
  OfferCodeItem,
  OfferCodesConfig,
} from "@/lib/integrations/settings";

/**
 * The welcome offer is always the first enabled code in admin order, so the
 * shop owner picks it by ordering codes on the offer codes settings page.
 * This code is reserved for a customer's first order and is enforced at checkout.
 */
export function selectWelcomeOfferCode(
  config: OfferCodesConfig,
): OfferCodeItem | null {
  if (!config.enabled) return null;
  return (
    config.codes.find((item) => item.enabled && item.percentage > 0) ?? null
  );
}

export function normalizeOfferCode(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export type WelcomeOfferEligibility = {
  code: string | null;
  percentage: number;
  /** Signed-in shoppers lose eligibility once they have a completed order. */
  eligible: boolean;
  signedIn: boolean;
};

export function isWelcomeOfferCode(
  config: OfferCodesConfig,
  code: string | null | undefined,
): boolean {
  const welcome = selectWelcomeOfferCode(config);
  if (!welcome) return false;
  return welcome.code === normalizeOfferCode(code);
}
