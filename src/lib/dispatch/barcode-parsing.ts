import { sanitizeTrackingNumber } from "./tracking-sanitizer";

export function parseTrackingNumberFromBarcodeText(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  try {
    const sanitized = sanitizeTrackingNumber(trimmed);
    return sanitized && /\d/.test(sanitized) ? sanitized : null;
  } catch {
    const matches = trimmed.match(/[A-Za-z0-9\-_/]+/g) ?? [];
    const withDigits = matches.find((value) => /\d/.test(value));
    if (!withDigits) return null;
    try {
      return sanitizeTrackingNumber(withDigits);
    } catch {
      return null;
    }
  }
}
