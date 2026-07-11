/** Shop operating timezone — India Standard Time (no DST). */
export const INDIA_TIME_ZONE = "Asia/Kolkata" as const;

function toValidDate(
  value: Date | string | number | null | undefined,
): Date | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Format any instant in Asia/Kolkata using Intl (robust, no extra deps).
 * Always label with IST so admins know the zone without guessing.
 */
export function formatInIndiaTimeZone(
  value: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = toValidDate(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: INDIA_TIME_ZONE,
    ...options,
  }).format(date);
}

/** Order list / detail: e.g. "11 Jul 2026, 04:22 pm IST" */
export function formatOrderDateTimeIst(
  value: Date | string | number | null | undefined,
): string {
  const date = toValidDate(value);
  if (!date) return "—";

  const formatted = formatInIndiaTimeZone(date, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // en-IN already uses Indian conventions; append IST for clarity.
  return `${formatted} IST`;
}

/** Date-only in IST (reports / short labels). */
export function formatOrderDateIst(
  value: Date | string | number | null | undefined,
): string {
  return formatInIndiaTimeZone(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Machine-readable ISO UTC + human IST for notifications (Velo, WhatsApp, etc.). */
export function buildOrderPlacedAtPayload(
  value: Date | string | number | null | undefined,
): {
  placedAt: string | null;
  placedAtIst: string | null;
  timeZone: typeof INDIA_TIME_ZONE;
} {
  const date = toValidDate(value);
  if (!date) {
    return {
      placedAt: null,
      placedAtIst: null,
      timeZone: INDIA_TIME_ZONE,
    };
  }

  return {
    placedAt: date.toISOString(),
    placedAtIst: formatOrderDateTimeIst(date),
    timeZone: INDIA_TIME_ZONE,
  };
}
