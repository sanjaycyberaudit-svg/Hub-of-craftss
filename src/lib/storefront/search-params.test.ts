import {
  buildShopSearchVariables,
  featuredVariablesToQueryString,
  formatShopPriceRangeHeading,
  pageSearchParamsToUrlSearchParams,
  searchVariablesToQueryString,
} from "./search-params";

describe("buildShopSearchVariables", () => {
  it("defaults to first page of 4 products", () => {
    const variables = buildShopSearchVariables({});

    expect(variables.first).toBe(4);
    expect(variables.after).toBeUndefined();
    expect(variables.search).toBe("%%");
  });

  it("maps collectionId for collection pages", () => {
    const variables = buildShopSearchVariables({}, "collection-123");

    expect(variables.collections).toEqual(["collection-123"]);
  });

  it("round-trips with searchVariablesToQueryString", () => {
    const variables = buildShopSearchVariables({
      search: "silk",
      sort: "PRICE_LOW_TO_HIGH",
    });
    const params = pageSearchParamsToUrlSearchParams({
      search: "silk",
      sort: "PRICE_LOW_TO_HIGH",
    });
    const rebuilt = buildShopSearchVariables(params);

    expect(rebuilt.search).toBe(variables.search);
    expect(rebuilt.orderBy).toEqual(variables.orderBy);
    expect(searchVariablesToQueryString(variables)).toContain("search=silk");
  });

  it("maps shop by price URLs to inclusive GraphQL bounds", () => {
    const variables = buildShopSearchVariables({
      price_range: "300-499",
      sort: "PRICE_LOW_TO_HIGH",
    });

    expect(variables.lower).toBe("300");
    expect(variables.upper).toBe("499");
    expect(formatShopPriceRangeHeading({ price_range: "300-499" })).toContain(
      "300",
    );
  });
});

describe("featuredVariablesToQueryString", () => {
  it("builds featured mode query", () => {
    expect(featuredVariablesToQueryString({ first: 12 })).toBe(
      "mode=featured&first=12",
    );
  });
});
