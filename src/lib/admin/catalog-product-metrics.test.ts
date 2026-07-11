import { isLiveCatalogProduct } from "./catalog-product-metrics";

describe("isLiveCatalogProduct", () => {
  it("counts published non-archived products as live SKUs", () => {
    expect(isLiveCatalogProduct({ is_draft: false, archived_at: null })).toBe(
      true,
    );
    expect(isLiveCatalogProduct({ is_draft: false })).toBe(true);
  });

  it("excludes drafts and archived products", () => {
    expect(isLiveCatalogProduct({ is_draft: true, archived_at: null })).toBe(
      false,
    );
    expect(
      isLiveCatalogProduct({
        is_draft: false,
        archived_at: "2026-07-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });
});
