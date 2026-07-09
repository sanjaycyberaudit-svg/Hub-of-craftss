import { assertProductsArePublished } from "@/lib/storefront/product-visibility-policy";

describe("product-visibility-policy", () => {
  it("throws when unpublished product ids are present", () => {
    expect(() =>
      assertProductsArePublished(new Map([["p1", "Silk Saree"]]), ["p1"]),
    ).toThrow("Silk Saree is no longer available");
  });

  it("passes when all products are published", () => {
    expect(() =>
      assertProductsArePublished(new Map([["p1", "Silk Saree"]]), []),
    ).not.toThrow();
  });
});
