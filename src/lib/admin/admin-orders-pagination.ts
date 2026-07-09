export type AdminOrdersSegment = "paid" | "pending";

export const ADMIN_ORDERS_MIN_PAGE_SIZE = 5;
export const ADMIN_ORDERS_MAX_PAGE_SIZE = 100;
export const ADMIN_ORDERS_DEFAULT_PAGE_SIZE = 20;

export function clampAdminOrdersPageSize(value: number | undefined): number {
  const parsed = Number(value ?? ADMIN_ORDERS_DEFAULT_PAGE_SIZE);
  if (!Number.isFinite(parsed)) return ADMIN_ORDERS_DEFAULT_PAGE_SIZE;
  return Math.min(
    ADMIN_ORDERS_MAX_PAGE_SIZE,
    Math.max(ADMIN_ORDERS_MIN_PAGE_SIZE, Math.round(parsed)),
  );
}

/** Parse a 1-based page query param, defaulting to 1 for missing/invalid input. */
export function parseAdminOrdersPage(
  value: string | string[] | undefined,
): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw ?? "1"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
