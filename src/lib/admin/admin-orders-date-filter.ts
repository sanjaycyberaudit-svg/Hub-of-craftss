import { INDIA_TIME_ZONE } from "@/lib/datetime/india";

/** Relative presets stay correct across midnight; range/all are absolute. */
export type AdminOrdersDatePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "range"
  | "all";

export type AdminOrdersDateFilterState = {
  fromDate: string;
  toDate: string;
  allOrders: boolean;
  datePreset: AdminOrdersDatePreset;
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar day in Asia/Kolkata as YYYY-MM-DD. */
export function istCalendarDay(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isValidIsoDay(value: string): boolean {
  if (!ISO_DAY.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Noon IST for a calendar day — safe for day arithmetic (no DST in India). */
function istNoon(isoDay: string): Date {
  return new Date(`${isoDay}T12:00:00+05:30`);
}

export function shiftIstDateIso(iso: string, days: number): string {
  const dt = istNoon(iso);
  dt.setTime(dt.getTime() + days * 86_400_000);
  return istCalendarDay(dt);
}

/** Monday (IST) → today (IST). */
export function thisWeekRangeIst(now: Date = new Date()): {
  from: string;
  to: string;
} {
  const today = istCalendarDay(now);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: INDIA_TIME_ZONE,
    weekday: "short",
  }).format(istNoon(today));
  const monOffset =
    weekday === "Mon"
      ? 0
      : weekday === "Tue"
        ? -1
        : weekday === "Wed"
          ? -2
          : weekday === "Thu"
            ? -3
            : weekday === "Fri"
              ? -4
              : weekday === "Sat"
                ? -5
                : -6;
  return { from: shiftIstDateIso(today, monOffset), to: today };
}

/** First day of current IST month → today. */
export function thisMonthRangeIst(now: Date = new Date()): {
  from: string;
  to: string;
} {
  const today = istCalendarDay(now);
  const [y, m] = today.split("-");
  return { from: `${y}-${m}-01`, to: today };
}

export function createDayDateFilters(
  dayIso: string,
  datePreset: AdminOrdersDatePreset = "range",
): AdminOrdersDateFilterState {
  return {
    fromDate: dayIso,
    toDate: dayIso,
    allOrders: false,
    datePreset,
  };
}

export function createTodayDateFilters(
  now: Date = new Date(),
): AdminOrdersDateFilterState {
  return createDayDateFilters(istCalendarDay(now), "today");
}

export function createYesterdayDateFilters(
  now: Date = new Date(),
): AdminOrdersDateFilterState {
  return createDayDateFilters(
    shiftIstDateIso(istCalendarDay(now), -1),
    "yesterday",
  );
}

export function createThisWeekDateFilters(
  now: Date = new Date(),
): AdminOrdersDateFilterState {
  const { from, to } = thisWeekRangeIst(now);
  return {
    fromDate: from,
    toDate: to,
    allOrders: false,
    datePreset: "this_week",
  };
}

export function createThisMonthDateFilters(
  now: Date = new Date(),
): AdminOrdersDateFilterState {
  const { from, to } = thisMonthRangeIst(now);
  return {
    fromDate: from,
    toDate: to,
    allOrders: false,
    datePreset: "this_month",
  };
}

export function createAllOrdersDateFilters(): AdminOrdersDateFilterState {
  return {
    fromDate: "",
    toDate: "",
    allOrders: true,
    datePreset: "all",
  };
}

export function createRangeDateFilters(
  fromDate: string,
  toDate: string,
): AdminOrdersDateFilterState {
  return {
    fromDate,
    toDate,
    allOrders: false,
    datePreset: "range",
  };
}

export function createFiltersForPreset(
  preset: AdminOrdersDatePreset,
  now: Date = new Date(),
): AdminOrdersDateFilterState {
  switch (preset) {
    case "today":
      return createTodayDateFilters(now);
    case "yesterday":
      return createYesterdayDateFilters(now);
    case "this_week":
      return createThisWeekDateFilters(now);
    case "this_month":
      return createThisMonthDateFilters(now);
    case "all":
      return createAllOrdersDateFilters();
    default:
      return createTodayDateFilters(now);
  }
}

/** Resolve relative presets to current IST calendar bounds. */
export function resolveAdminOrdersDateFilters(
  filters: AdminOrdersDateFilterState,
  now: Date = new Date(),
): AdminOrdersDateFilterState {
  switch (filters.datePreset) {
    case "today":
      return createTodayDateFilters(now);
    case "yesterday":
      return createYesterdayDateFilters(now);
    case "this_week":
      return createThisWeekDateFilters(now);
    case "this_month":
      return createThisMonthDateFilters(now);
    case "all":
      return createAllOrdersDateFilters();
    default:
      if (filters.allOrders) return createAllOrdersDateFilters();
      return {
        ...filters,
        allOrders: false,
        datePreset: "range",
      };
  }
}

/** Default: today (IST) — never load full history on open. */
export const DEFAULT_ADMIN_ORDERS_DATE_FILTERS: AdminOrdersDateFilterState =
  createTodayDateFilters();

export function validateAdminOrdersDateFilters(
  filters: AdminOrdersDateFilterState,
): string | null {
  const resolved = resolveAdminOrdersDateFilters(filters);
  if (resolved.allOrders) return null;
  if (!resolved.fromDate.trim() || !resolved.toDate.trim()) {
    return "Select both From and To dates, or choose All.";
  }
  if (!isValidIsoDay(resolved.fromDate)) return "Invalid From date.";
  if (!isValidIsoDay(resolved.toDate)) return "Invalid To date.";
  if (resolved.fromDate > resolved.toDate) {
    return "From date must be on or before To date.";
  }
  return null;
}

/**
 * Inclusive IST calendar range → UTC instant bounds for SQL.
 * [from 00:00 IST, to+1 day 00:00 IST).
 */
export function istDateRangeToUtcBounds(
  fromDate: string,
  toDate: string,
): {
  startUtc: string;
  endExclusiveUtc: string;
} {
  const startUtc = new Date(`${fromDate}T00:00:00+05:30`).toISOString();
  const endExclusiveUtc = new Date(
    `${shiftIstDateIso(toDate, 1)}T00:00:00+05:30`,
  ).toISOString();
  return { startUtc, endExclusiveUtc };
}

export function formatIsoToDdMmYyyy(iso: string): string {
  const trimmed = iso.trim();
  if (!ISO_DAY.test(trimmed)) return "";
  const [y, m, d] = trimmed.split("-");
  return `${d}-${m}-${y}`;
}

export function parseDdMmYyyyToIso(text: string): string | null {
  const raw = text.trim();
  if (!raw) return "";
  const m = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    year < 1900 ||
    year > 2100
  ) {
    return null;
  }
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const iso = `${year}-${mm}-${dd}`;
  return isValidIsoDay(iso) ? iso : null;
}

export function describeAdminOrdersDateFilters(
  filters: AdminOrdersDateFilterState,
): string {
  const resolved = resolveAdminOrdersDateFilters(filters);
  if (resolved.allOrders || resolved.datePreset === "all") return "All dates";
  if (resolved.datePreset === "today") return "Today";
  if (resolved.datePreset === "yesterday") return "Yesterday";
  if (resolved.datePreset === "this_week") return "This week";
  if (resolved.datePreset === "this_month") return "This month";
  const from = formatIsoToDdMmYyyy(resolved.fromDate);
  const to = formatIsoToDdMmYyyy(resolved.toDate);
  if (from && to) return from === to ? from : `${from} – ${to}`;
  return "All dates";
}

/** True when filter icon should show active (not plain Today). */
export function isAdminOrdersDateFilterHighlighted(
  filters: AdminOrdersDateFilterState,
): boolean {
  const resolved = resolveAdminOrdersDateFilters(filters);
  return resolved.datePreset !== "today" || resolved.allOrders;
}

export function adminOrdersDateFiltersFromSearchParams(input: {
  from?: string | null;
  to?: string | null;
  all?: string | null;
  preset?: string | null;
}): AdminOrdersDateFilterState {
  if (input.all === "1" || input.all === "true") {
    return createAllOrdersDateFilters();
  }

  const presetRaw = String(input.preset ?? "")
    .trim()
    .toLowerCase();
  if (
    presetRaw === "today" ||
    presetRaw === "yesterday" ||
    presetRaw === "this_week" ||
    presetRaw === "this_month" ||
    presetRaw === "all"
  ) {
    return createFiltersForPreset(presetRaw as AdminOrdersDatePreset);
  }

  const from = (input.from || "").trim();
  const to = (input.to || "").trim();
  if (isValidIsoDay(from) && isValidIsoDay(to) && from <= to) {
    const today = istCalendarDay();
    if (from === today && to === today) return createTodayDateFilters();
    const yesterday = shiftIstDateIso(today, -1);
    if (from === yesterday && to === yesterday) {
      return createYesterdayDateFilters();
    }
    const week = thisWeekRangeIst();
    if (from === week.from && to === week.to) {
      return createThisWeekDateFilters();
    }
    const month = thisMonthRangeIst();
    if (from === month.from && to === month.to) {
      return createThisMonthDateFilters();
    }
    return createRangeDateFilters(from, to);
  }

  return createThisMonthDateFilters();
}

/** Build query params for date filter (merge with status/page elsewhere). */
export function appendAdminOrdersDateParams(
  params: URLSearchParams,
  filters: AdminOrdersDateFilterState,
): void {
  const resolved = resolveAdminOrdersDateFilters(filters);
  params.delete("from");
  params.delete("to");
  params.delete("all");
  params.delete("preset");

  if (resolved.allOrders || resolved.datePreset === "all") {
    params.set("all", "1");
    return;
  }

  if (
    resolved.datePreset === "today" ||
    resolved.datePreset === "yesterday" ||
    resolved.datePreset === "this_week" ||
    resolved.datePreset === "this_month"
  ) {
    params.set("preset", resolved.datePreset);
    return;
  }

  if (
    isValidIsoDay(resolved.fromDate) &&
    isValidIsoDay(resolved.toDate) &&
    resolved.fromDate <= resolved.toDate
  ) {
    params.set("from", resolved.fromDate);
    params.set("to", resolved.toDate);
  }
}

export const ADMIN_ORDERS_PERIOD_MENU: {
  preset: Exclude<AdminOrdersDatePreset, "range">;
  label: string;
}[] = [
  { preset: "today", label: "Today" },
  { preset: "yesterday", label: "Yesterday" },
  { preset: "this_week", label: "This Week" },
  { preset: "this_month", label: "This Month" },
  { preset: "all", label: "All" },
];
