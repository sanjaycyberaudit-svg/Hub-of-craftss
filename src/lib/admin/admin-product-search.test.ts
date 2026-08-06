import { buildAdminProductSearchPattern } from "@/lib/admin/admin-product-search";

describe("buildAdminProductSearchPattern", () => {
  it("matches hyphenated names when searching with spaces", () => {
    expect(buildAdminProductSearchPattern("A line")).toBe("%A%line%");
  });

  it("keeps single-token searches as simple contains", () => {
    expect(buildAdminProductSearchPattern("kolam")).toBe("%kolam%");
  });

  it("treats hyphens and underscores like spaces", () => {
    expect(buildAdminProductSearchPattern("A-LINE")).toBe("%A%LINE%");
    expect(buildAdminProductSearchPattern("chain_tool")).toBe("%chain%tool%");
  });

  it("escapes LIKE wildcards", () => {
    expect(buildAdminProductSearchPattern("100%")).toBe("%100\\%%");
  });
});
