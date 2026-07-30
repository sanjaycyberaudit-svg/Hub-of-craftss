"use client";

import type { OfferCodeItem, OfferCodesConfig } from "@/lib/integrations/settings";

const DISMISSED_KEY = "hoc:welcome-offer-dismissed";
const CLAIMED_KEY = "hoc:welcome-offer-claimed";

/**
 * The welcome popup always advertises the first enabled code in admin order,
 * so shop owners control the offer by ordering codes on the settings page.
 */
export function getWelcomeOfferCode(
  config: OfferCodesConfig,
): OfferCodeItem | null {
  if (!config.enabled) return null;
  return config.codes.find((item) => item.enabled && item.percentage > 0) ?? null;
}

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
