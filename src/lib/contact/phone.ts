/**
 * Normalize phone strings for `tel:` and `wa.me` links.
 * Shop is India-first: bare 10-digit mobiles get country code 91.
 */

export const DEFAULT_PHONE_COUNTRY_CODE = "91";

/** Digits only, with India country code when the input is a local mobile. */
export function toInternationalPhoneDigits(
  raw: string | null | undefined,
  defaultCountryCode = DEFAULT_PHONE_COUNTRY_CODE,
): string {
  let digits = String(raw ?? "")
    .replace(/^tel:/i, "")
    .replace(/\D/g, "");

  if (!digits) return "";

  // International dialing prefix 00…
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // National trunk prefix 0XXXXXXXXXX (India)
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Already country-coded Indian mobile: 91 + 10 digits
  if (
    digits.length === 12 &&
    digits.startsWith(defaultCountryCode) &&
    /^[6-9]/.test(digits.slice(2))
  ) {
    return digits;
  }

  // Local 10-digit Indian mobile (also accept any 10-digit for this store)
  if (digits.length === 10) {
    return `${defaultCountryCode}${digits}`;
  }

  // Other valid E.164 lengths — leave as entered
  if (digits.length >= 11 && digits.length <= 15) {
    return digits;
  }

  return digits;
}

export function buildTelHref(phone: string): string {
  const digits = toInternationalPhoneDigits(phone);
  return digits ? `tel:+${digits}` : "tel:";
}

export function buildWhatsAppHref(phone: string): string {
  const digits = toInternationalPhoneDigits(phone);
  return digits ? `https://wa.me/${digits}` : "https://wa.me/";
}
