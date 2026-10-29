/**
 * Free-gift ladder for the Welcome Offer popup.
 * Tamil + English pairs (Tamil first for each threshold).
 *
 * Thresholds: ₹499 → ₹999 → ₹1,999 → ₹2,999 → ₹4,999
 * (₹2,999 is the second ₹1,999 line from the shop list, so the ladder is clear.)
 */
export const WELCOME_FREE_GIFT_MESSAGES = [
  "₹499க்கு மேல் வாங்கினால் — ₹89 worth FREE GIFT 🎁",
  "Buy above ₹499 — get a FREE GIFT worth ₹89 🎁",
  "₹999 மேல் வாங்கினால் — ₹150 worth FREE GIFT 🎁",
  "Buy above ₹999 — get a FREE GIFT worth ₹150 🎁",
  "₹1,999க்கு மேல் வாங்கினால் — ₹299 worth FREE GIFT 🎁",
  "Buy above ₹1,999 — get a FREE GIFT worth ₹299 🎁",
  "₹2,999க்கு மேல் வாங்கினால் — ₹350 worth FREE GIFT 🎁",
  "Buy above ₹2,999 — get a FREE GIFT worth ₹350 🎁",
  "₹4,999க்கு மேல் வாங்கினால் — ₹500 worth FREE GIFT 🎁",
  "Buy above ₹4,999 — get a FREE GIFT worth ₹500 🎁",
] as const;

export const MAX_WELCOME_EXTRA_MESSAGES = 20;
export const MAX_WELCOME_EXTRA_MESSAGE_LENGTH = 160;

export function parseWelcomeExtraMessages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const entry of raw) {
    const text = String(entry ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_WELCOME_EXTRA_MESSAGE_LENGTH);
    if (!text) continue;
    out.push(text);
    if (out.length >= MAX_WELCOME_EXTRA_MESSAGES) break;
  }
  return out;
}

/** Append preset gift lines; skip texts already present (case-insensitive). */
export function mergeWelcomeGiftPresets(existing: string[]): string[] {
  const seen = new Set(
    existing.map((line) => line.trim().toLowerCase()).filter(Boolean),
  );
  const merged = [...existing];
  for (const line of WELCOME_FREE_GIFT_MESSAGES) {
    const key = line.trim().toLowerCase();
    if (seen.has(key)) continue;
    if (merged.length >= MAX_WELCOME_EXTRA_MESSAGES) break;
    merged.push(line);
    seen.add(key);
  }
  return merged;
}
