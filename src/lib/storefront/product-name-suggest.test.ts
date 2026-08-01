import { normalizeStorefrontSearchTerm } from "@/lib/storefront/search-utils";
import {
  clampSuggestLimit,
  sanitizeSuggestQuery,
} from "@/lib/storefront/product-name-suggest-shared";

describe("product-name-suggest helpers", () => {
  const sanitize = (raw: string | null | undefined) =>
    sanitizeSuggestQuery(raw, normalizeStorefrontSearchTerm);

  it("rejects short or empty queries", () => {
    expect(sanitize("")).toBeNull();
    expect(sanitize("a")).toBeNull();
    expect(sanitize("  ab  ")).toBe("ab");
  });

  it("strips ILIKE wildcards and caps length", () => {
    expect(sanitize("%silk_saree%")).toBe("silksaree");
    const long = "x".repeat(80);
    expect(sanitize(long)?.length).toBe(64);
  });

  it("clamps suggestion limits", () => {
    expect(clampSuggestLimit(undefined)).toBe(8);
    expect(clampSuggestLimit(0)).toBe(1);
    expect(clampSuggestLimit(99)).toBe(12);
    expect(clampSuggestLimit("5")).toBe(5);
  });
});
