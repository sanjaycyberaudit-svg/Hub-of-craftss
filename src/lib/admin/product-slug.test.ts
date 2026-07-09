import { buildUniqueProductSlug, productNameToSlug } from "./product-slug";

describe("productNameToSlug", () => {
  it("slugifies product names", () => {
    expect(productNameToSlug("Kanchipuram Silk Saree")).toBe(
      "kanchipuram-silk-saree",
    );
  });

  it("falls back to product code when name is empty", () => {
    expect(productNameToSlug("", "ST000045")).toBe("product-st000045");
  });
});

describe("buildUniqueProductSlug", () => {
  it("returns the base slug when unused", async () => {
    const executor = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
      execute: async () => [],
    };

    await expect(
      buildUniqueProductSlug(executor, "Silk Saree", "ST000001"),
    ).resolves.toBe("silk-saree");
  });
});
