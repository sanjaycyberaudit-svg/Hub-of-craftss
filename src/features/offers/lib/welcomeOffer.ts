"use client";

export {
  selectWelcomeGift as getWelcomeGift,
  selectWelcomeOfferCode as getWelcomeOfferCode,
} from "@/lib/offers/welcome-code";

const DISMISSED_KEY = "hoc:welcome-offer-dismissed";
const CLAIMED_KEY = "hoc:welcome-offer-claimed";
const GIFT_DISMISSED_KEY = "hoc:welcome-gift-dismissed";
export const WELCOME_OFFER_CLOSED_EVENT = "hoc:welcome-offer-closed";

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures (private mode / blocked cookies).
  }
}

function removeStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures (private mode / blocked cookies).
  }
}

export function isWelcomeOfferDismissed(code: string): boolean {
  return readStorage(DISMISSED_KEY) === code;
}

export function markWelcomeOfferDismissed(code: string) {
  writeStorage(DISMISSED_KEY, code);
}

export function loadClaimedOfferCode(): string | null {
  const value = readStorage(CLAIMED_KEY);
  return value ? value.trim().toUpperCase() : null;
}

export function saveClaimedOfferCode(code: string) {
  writeStorage(CLAIMED_KEY, code.trim().toUpperCase());
}

export function clearClaimedOfferCode() {
  removeStorage(CLAIMED_KEY);
}

export function isWelcomeGiftDismissed(): boolean {
  return readStorage(GIFT_DISMISSED_KEY) === "1";
}

export function markWelcomeGiftDismissed() {
  writeStorage(GIFT_DISMISSED_KEY, "1");
}

export function notifyWelcomeOfferClosed() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WELCOME_OFFER_CLOSED_EVENT));
}
