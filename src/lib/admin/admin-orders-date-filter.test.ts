import {
  appendAdminOrdersDateParams,
  adminOrdersDateFiltersFromSearchParams,
  createTodayDateFilters,
  createYesterdayDateFilters,
  describeAdminOrdersDateFilters,
  formatIsoToDdMmYyyy,
  isValidIsoDay,
  istCalendarDay,
  istDateRangeToUtcBounds,
  parseDdMmYyyyToIso,
  resolveAdminOrdersDateFilters,
  shiftIstDateIso,
  thisMonthRangeIst,
  thisWeekRangeIst,
  validateAdminOrdersDateFilters,
} from "./admin-orders-date-filter";

describe("admin-orders-date-filter", () => {
  it("formats IST calendar day as YYYY-MM-DD", () => {
    const day = istCalendarDay(new Date("2026-08-29T18:30:00.000Z"));
    expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(isValidIsoDay(day)).toBe(true);
  });

  it("shifts IST days without UTC drift", () => {
    expect(shiftIstDateIso("2026-08-29", -1)).toBe("2026-08-28");
    expect(shiftIstDateIso("2026-08-01", -1)).toBe("2026-07-31");
  });

  it("builds week/month ranges ending today", () => {
    const fixed = new Date("2026-08-29T10:00:00+05:30");
    const week = thisWeekRangeIst(fixed);
    const month = thisMonthRangeIst(fixed);
    expect(week.to).toBe("2026-08-29");
    expect(week.from <= week.to).toBe(true);
    expect(month).toEqual({ from: "2026-08-01", to: "2026-08-29" });
  });

  it("maps IST day range to exclusive UTC bounds", () => {
    const { startUtc, endExclusiveUtc } = istDateRangeToUtcBounds(
      "2026-08-29",
      "2026-08-29",
    );
    expect(startUtc).toBe("2026-08-28T18:30:00.000Z");
    expect(endExclusiveUtc).toBe("2026-08-29T18:30:00.000Z");
  });

  it("parses DD-MM-YYYY and validates range", () => {
    expect(parseDdMmYyyyToIso("29-08-2026")).toBe("2026-08-29");
    expect(formatIsoToDdMmYyyy("2026-08-29")).toBe("29-08-2026");
    expect(
      validateAdminOrdersDateFilters({
        fromDate: "2026-08-30",
        toDate: "2026-08-29",
        allOrders: false,
        datePreset: "range",
      }),
    ).toMatch(/on or before/i);
  });

  it("defaults missing URL params to today", () => {
    const filters = adminOrdersDateFiltersFromSearchParams({});
    expect(resolveAdminOrdersDateFilters(filters).datePreset).toBe("today");
    expect(describeAdminOrdersDateFilters(createTodayDateFilters())).toBe(
      "Today",
    );
    expect(describeAdminOrdersDateFilters(createYesterdayDateFilters())).toBe(
      "Yesterday",
    );
  });

  it("appends preset or all to URL params", () => {
    const params = new URLSearchParams();
    appendAdminOrdersDateParams(params, createTodayDateFilters());
    expect(params.get("preset")).toBe("today");
    expect(params.get("all")).toBeNull();

    const all = new URLSearchParams();
    appendAdminOrdersDateParams(all, {
      fromDate: "",
      toDate: "",
      allOrders: true,
      datePreset: "all",
    });
    expect(all.get("all")).toBe("1");
  });
});
