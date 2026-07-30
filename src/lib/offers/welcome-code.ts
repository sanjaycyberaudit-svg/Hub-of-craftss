import type {
  OfferCodeItem,
  OfferCodesConfig,
} from "@/lib/integrations/settings";

/** Returns the dedicated, admin-controlled first-order popup offer. */
export function selectWelcomeOfferCode(
  config: OfferCodesConfig,
): OfferCodeItem | null {
  const offer = config.welcomeOffer;
  if (!offer.enabled || !offer.code || offer.percentage <= 0) return null;
  return offer;
}

/** All currently usable codes, with the dedicated welcome code kept separate. */
export function selectActiveOfferCodes(
  config: OfferCodesConfig,
): OfferCodeItem[] {
  const common = config.enabled
    ? config.codes.filter((item) => item.enabled && item.percentage > 0)
    : [];
  const welcome = selectWelcomeOfferCode(config);
  return welcome ? [welcome, ...common] : common;
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
