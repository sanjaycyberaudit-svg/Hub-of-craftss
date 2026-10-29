import type { StorefrontAnnouncement } from "@/lib/announcements/types";

/**
 * Free-gift ladder shown on the storefront announcement ribbon.
 * Tamil + English pairs (Tamil first, then English for the same threshold).
 *
 * Thresholds: ₹499 → ₹999 → ₹1,999 → ₹2,999 → ₹4,999
 * (₹2,999 covers the second ₹1,999 line from the shop's gift list.)
 */
export const FREE_GIFT_OFFER_PRESETS: ReadonlyArray<
  Omit<StorefrontAnnouncement, "id">
> = [
  {
    text: "₹499க்கு மேல் வாங்கினால் — ₹89 worth FREE GIFT 🎁",
    href: "/shop",
    cta: "Shop now",
  },
  {
    text: "Buy above ₹499 — get a FREE GIFT worth ₹89 🎁",
    href: "/shop",
    cta: "Shop now",
  },
  {
    text: "₹999 மேல் வாங்கினால் — ₹150 worth FREE GIFT 🎁",
    href: "/shop",
    cta: "Shop now",
  },
  {
    text: "Buy above ₹999 — get a FREE GIFT worth ₹150 🎁",
    href: "/shop",
    cta: "Shop now",
  },
  {
    text: "₹1,999க்கு மேல் வாங்கினால் — ₹299 worth FREE GIFT 🎁",
    href: "/shop",
    cta: "Shop now",
  },
  {
    text: "Buy above ₹1,999 — get a FREE GIFT worth ₹299 🎁",
    href: "/shop",
    cta: "Shop now",
  },
  {
    text: "₹2,999க்கு மேல் வாங்கினால் — ₹350 worth FREE GIFT 🎁",
    href: "/shop",
    cta: "Shop now",
  },
  {
    text: "Buy above ₹2,999 — get a FREE GIFT worth ₹350 🎁",
    href: "/shop",
    cta: "Shop now",
  },
  {
    text: "₹4,999க்கு மேல் வாங்கினால் — ₹500 worth FREE GIFT 🎁",
    href: "/shop",
    cta: "Shop now",
  },
  {
    text: "Buy above ₹4,999 — get a FREE GIFT worth ₹500 🎁",
    href: "/shop",
    cta: "Shop now",
  },
];

export function buildFreeGiftOfferLines(
  startIndex = 1,
): StorefrontAnnouncement[] {
  return FREE_GIFT_OFFER_PRESETS.map((line, index) => ({
    id: `gift-offer-${startIndex + index}`,
    text: line.text,
    href: line.href,
    cta: line.cta,
  }));
}
