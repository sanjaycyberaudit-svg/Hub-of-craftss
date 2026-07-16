import {
  normalizeDecimalInput,
  normalizeProductFormPayload,
  productStorefrontVisibilitySummary,
} from "./normalize-product-form-payload";

const base = {
  name: "Silk Saree",
  slug: "silk-saree",
  description: "Handcrafted silk saree.",
  rating: "4",
  price: "999",
  stock: 2,
  isDraft: false,
  featured: false,
  badge: null as null,
  tags: [] as string[],
  collectionId: "col-1",
  featuredImageId: "img-1",
};

describe("normalizeDecimalInput", () => {
  it("rejects blank required decimals", () => {
    expect(() =>
      normalizeDecimalInput("", {
        fallback: "0",
        fieldLabel: "Price",
        required: true,
      }),
    ).toThrow(/Price is required/);
  });

  it("uses fallback for blank optional decimals", () => {
    expect(
      normalizeDecimalInput("  ", {
        fallback: "4",
        fieldLabel: "Rating",
        required: false,
      }),
    ).toBe("4");
  });

  it("rejects non-numeric text", () => {
    expect(() =>
      normalizeDecimalInput("abc", {
        fallback: "0",
        fieldLabel: "Price",
        required: true,
      }),
    ).toThrow(/valid price/i);
  });
});

describe("normalizeProductFormPayload", () => {
  it("normalizes featured and draft flags", () => {
    const payload = normalizeProductFormPayload({
      ...base,
      name: " Silk Saree ",
      isDraft: 0 as unknown as boolean,
      featured: 1 as unknown as boolean,
      badge: "best_sale",
    });

    expect(payload.name).toBe("Silk Saree");
    expect(payload.isDraft).toBe(false);
    expect(payload.featured).toBe(true);
    expect(payload.badge).toBe("best_sale");
  });

  it("clears invalid badge values", () => {
    const payload = normalizeProductFormPayload({
      ...base,
      badge: "invalid" as never,
    });

    expect(payload.badge).toBeNull();
  });

  it("defaults empty rating and rejects empty price", () => {
    expect(
      normalizeProductFormPayload({
        ...base,
        rating: "" as never,
        price: "1299",
      }).rating,
    ).toBe("4");

    expect(() =>
      normalizeProductFormPayload({
        ...base,
        price: "" as never,
      }),
    ).toThrow(/Price is required/);
  });

  it("rejects missing catalog", () => {
    expect(() =>
      normalizeProductFormPayload({
        ...base,
        collectionId: "" as never,
      }),
    ).toThrow(/Catalog is required/);
  });

  it("rejects missing description", () => {
    expect(() =>
      normalizeProductFormPayload({
        ...base,
        description: "   ",
      }),
    ).toThrow(/Description is required/);
  });
});

describe("productStorefrontVisibilitySummary", () => {
  it("describes featured live products", () => {
    expect(
      productStorefrontVisibilitySummary({ featured: true, isDraft: false }),
    ).toContain("Featured");
  });

  it("describes draft products", () => {
    expect(
      productStorefrontVisibilitySummary({ featured: true, isDraft: true }),
    ).toContain("draft");
  });
});
