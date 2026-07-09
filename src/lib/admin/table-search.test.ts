import {
  buildAdminCollectionSearchText,
  buildAdminProductSearchText,
  matchesAdminProductTableSearch,
  matchesAdminTableSearch,
  normalizeAdminSearchText,
  parseAdminSearchQuery,
  tokenizeAdminSearchQuery,
} from "./table-search";

describe("admin table search", () => {
  it("normalizes separators and casing", () => {
    expect(normalizeAdminSearchText("Kanchi-Semi_Silk")).toBe(
      "kanchi semi silk",
    );
  });

  it("strips html from descriptions", () => {
    expect(normalizeAdminSearchText("<p>Soft <strong>Silk</strong></p>")).toBe(
      "soft silk",
    );
  });

  it("tokenizes queries", () => {
    expect(tokenizeAdminSearchQuery("  Silk   Saree ")).toEqual([
      "silk",
      "saree",
    ]);
  });

  it("parses quoted phrases and free tokens", () => {
    expect(parseAdminSearchQuery('"silk saree" kanchi')).toEqual({
      phrases: ["silk saree"],
      tokens: ["kanchi"],
    });
  });

  it("matches every query token anywhere in haystack", () => {
    const haystack = "kanchi semi silk kanchi sarees silk sarees";
    expect(matchesAdminTableSearch(haystack, "silk kanchi")).toBe(true);
    expect(matchesAdminTableSearch(haystack, "silk cotton")).toBe(false);
  });

  it("requires quoted phrases to match contiguous text", () => {
    const haystack = "kanchi semi silk saree";
    expect(matchesAdminTableSearch(haystack, '"semi silk"')).toBe(true);
    expect(matchesAdminTableSearch(haystack, '"silk kanchi"')).toBe(false);
  });

  it("matches compact slug fragments without separators", () => {
    const haystack = buildAdminProductSearchText({
      node: {
        name: "Kanchi Semi Silk",
        slug: "kanchi-semi-silk-maroon",
      },
    });

    expect(matchesAdminTableSearch(haystack, "kanchisemisilk")).toBe(true);
    expect(matchesAdminTableSearch(haystack, "maroon")).toBe(true);
  });

  it("matches badge values with underscores as words", () => {
    const haystack = buildAdminProductSearchText({
      node: {
        name: "Soft Silk",
        badge: "new_product",
        slug: "soft-silk-gold",
        collections: { label: "Silk Sarees", slug: "silk-sarees" },
      },
    });

    expect(matchesAdminTableSearch(haystack, "new product")).toBe(true);
    expect(matchesAdminTableSearch(haystack, "silk sarees")).toBe(true);
    expect(matchesAdminTableSearch(haystack, "soft gold")).toBe(true);
  });

  it("matches featured and price fields", () => {
    const haystack = buildAdminProductSearchText({
      node: {
        name: "Soft Silk",
        featured: true,
        price: "1299.00",
        stock: 12,
        rating: "4.8",
      },
    });

    expect(matchesAdminTableSearch(haystack, "featured")).toBe(true);
    expect(matchesAdminTableSearch(haystack, "1299")).toBe(true);
    expect(matchesAdminTableSearch(haystack, "12")).toBe(true);
    expect(matchesAdminTableSearch(haystack, "4.8")).toBe(true);
  });

  it("matches shorthand product codes like ST_01 against ST000001", () => {
    const row = {
      node: {
        name: "Product 2 ST000001",
        productCode: "ST000001",
        isDraft: true,
        slug: "product-st000001",
      },
    };

    expect(matchesAdminProductTableSearch(row, "ST_01")).toBe(true);
    expect(matchesAdminProductTableSearch(row, "ST01")).toBe(true);
    expect(matchesAdminProductTableSearch(row, "ST000001")).toBe(true);
    expect(matchesAdminProductTableSearch(row, "ST00001")).toBe(true);
    expect(matchesAdminProductTableSearch(row, "st_01")).toBe(true);
  });

  it("does not match every product when searching a specific product code", () => {
    const firstProduct = {
      node: {
        name: "UPPADA SAREE ST000001",
        productCode: "ST000001",
        slug: "product-st000001",
        price: "869",
        stock: 15,
      },
    };
    const otherProduct = {
      node: {
        name: "UPPADA SAREE ST000240",
        productCode: "ST000240",
        slug: "product-st000240",
        price: "869",
        stock: 15,
      },
    };

    expect(matchesAdminProductTableSearch(firstProduct, "ST00001")).toBe(true);
    expect(matchesAdminProductTableSearch(otherProduct, "ST00001")).toBe(false);
    expect(matchesAdminProductTableSearch(otherProduct, "ST000240")).toBe(true);
    expect(matchesAdminProductTableSearch(firstProduct, "ST000240")).toBe(
      false,
    );
    expect(matchesAdminProductTableSearch(otherProduct, "ST000239")).toBe(
      false,
    );
    expect(
      matchesAdminProductTableSearch(
        {
          node: {
            name: "UPPADA SAREE ST000239",
            productCode: "ST000239",
            slug: "product-st000239",
          },
        },
        "ST000239",
      ),
    ).toBe(true);
  });

  it("matches product codes and draft status", () => {
    const row = {
      node: {
        name: "Product 2",
        productCode: "ST_01",
        isDraft: true,
        slug: "product-2",
      },
    };

    expect(matchesAdminProductTableSearch(row, "ST_01")).toBe(true);
    expect(matchesAdminProductTableSearch(row, "st01")).toBe(true);
    expect(matchesAdminProductTableSearch(row, "draft")).toBe(true);
    expect(matchesAdminProductTableSearch(row, "product 2")).toBe(true);
  });

  it("searches collection label title slug and description", () => {
    const haystack = buildAdminCollectionSearchText({
      node: {
        label: "Kanchi Sarees",
        title: "Kanchipuram Collection",
        slug: "kanchi-sarees",
        description: "Traditional wedding sarees",
      },
    });

    expect(matchesAdminTableSearch(haystack, "kanchi wedding")).toBe(true);
    expect(matchesAdminTableSearch(haystack, "kanchipuram")).toBe(true);
    expect(matchesAdminTableSearch(haystack, "kanchisarees")).toBe(true);
    expect(matchesAdminTableSearch(haystack, "cotton")).toBe(false);
  });
});
