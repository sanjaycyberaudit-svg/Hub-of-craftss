import {
  ADMIN_ORDERS_DEFAULT_PAGE_SIZE,
  ADMIN_ORDERS_MAX_PAGE_SIZE,
  ADMIN_ORDERS_MIN_PAGE_SIZE,
  clampAdminOrdersPageSize,
  parseAdminOrdersPage,
} from "./admin-orders-pagination";

describe("clampAdminOrdersPageSize", () => {
  it("falls back to the default for missing or invalid values", () => {
    expect(clampAdminOrdersPageSize(undefined)).toBe(
      ADMIN_ORDERS_DEFAULT_PAGE_SIZE,
    );
    expect(clampAdminOrdersPageSize(Number.NaN)).toBe(
      ADMIN_ORDERS_DEFAULT_PAGE_SIZE,
    );
  });

  it("clamps to the supported range", () => {
    expect(clampAdminOrdersPageSize(1)).toBe(ADMIN_ORDERS_MIN_PAGE_SIZE);
    expect(clampAdminOrdersPageSize(9999)).toBe(ADMIN_ORDERS_MAX_PAGE_SIZE);
  });

  it("keeps and rounds valid in-range values", () => {
    expect(clampAdminOrdersPageSize(30)).toBe(30);
    expect(clampAdminOrdersPageSize(19.6)).toBe(20);
  });
});

describe("parseAdminOrdersPage", () => {
  it("defaults to page 1 for missing or invalid input", () => {
    expect(parseAdminOrdersPage(undefined)).toBe(1);
    expect(parseAdminOrdersPage("abc")).toBe(1);
    expect(parseAdminOrdersPage("0")).toBe(1);
    expect(parseAdminOrdersPage("-3")).toBe(1);
  });

  it("parses valid pages and takes the first of repeated params", () => {
    expect(parseAdminOrdersPage("4")).toBe(4);
    expect(parseAdminOrdersPage(["2", "5"])).toBe(2);
  });
});
