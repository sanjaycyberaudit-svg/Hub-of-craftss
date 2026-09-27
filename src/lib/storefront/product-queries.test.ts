/** @jest-environment node */
const mockQuery = jest.fn();

jest.mock("server-only", () => ({}));
jest.mock("../urql", () => ({
  getClient: () => ({ query: mockQuery }),
}));
jest.mock("../cache/storefront-cache", () => ({
  withStorefrontCache: jest.fn((_key: string, loader: () => Promise<unknown>) =>
    loader(),
  ),
}));
jest.mock("./filter-draft-products", () => ({
  filterDraftProductsFromCollection: jest.fn(async (value: unknown) => value),
}));
jest.mock("./collection-search", () => ({
  findMatchingCollections: jest.fn(async () => []),
}));
jest.mock("./product-price-search", () => ({
  fetchProductsByEffectivePriceRange: jest.fn(),
}));
jest.mock("./documents", () => ({
  FeaturedProductsQueryDocument: "featured-doc",
  SearchInCollectionQueryDocument: "search-in-collection-doc",
  SearchQueryDocument: "search-doc",
}));
jest.mock("../catalog/d1-mirror", () => {
  const actual = jest.requireActual("../catalog/d1-mirror");
  return {
    ...actual,
    isCatalogD1Enabled: jest.fn(() => false),
    fetchCatalogProductSearch: jest.fn(),
    fetchCatalogFeaturedProducts: jest.fn(),
  };
});
jest.mock("next/server", () => ({ after: jest.fn() }));

import {
  fetchCatalogFeaturedProducts,
  fetchCatalogProductSearch,
  isCatalogD1Enabled,
} from "../catalog/d1-mirror";
import {
  fetchFeaturedProductsCached,
  fetchProductSearchCached,
} from "./product-queries";

const supabasePage = {
  edges: [{ node: { id: "from-supabase" } }],
  pageInfo: { hasNextPage: false, endCursor: null },
};
const mirrorPage = {
  edges: [{ node: { id: "from-d1" } }],
  pageInfo: { hasNextPage: true, endCursor: "4" },
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
  mockQuery.mockResolvedValue({ data: { productsCollection: supabasePage } });
});

describe("fetchProductSearchCached", () => {
  it("reads Supabase when CATALOG_READ is not d1", async () => {
    const result = await fetchProductSearchCached({ search: "%%", first: 4 });
    expect(result.productsCollection).toEqual(supabasePage);
    expect(fetchCatalogProductSearch).not.toHaveBeenCalled();
  });

  it("serves the D1 mirror when enabled", async () => {
    jest.mocked(isCatalogD1Enabled).mockReturnValue(true);
    jest.mocked(fetchCatalogProductSearch).mockResolvedValue({
      productsCollection: mirrorPage as never,
      matchingCollections: [],
    });
    const result = await fetchProductSearchCached({ search: "%%", first: 4 });
    expect(result.productsCollection).toEqual(mirrorPage);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("falls back to Supabase when the mirror fails", async () => {
    jest.mocked(isCatalogD1Enabled).mockReturnValue(true);
    jest.mocked(fetchCatalogProductSearch).mockRejectedValue(new Error("down"));
    const result = await fetchProductSearchCached({ search: "%%", first: 4 });
    expect(result.productsCollection).toEqual(supabasePage);
  });

  it("lets Supabase resume its own GraphQL cursors", async () => {
    jest.mocked(isCatalogD1Enabled).mockReturnValue(true);
    await fetchProductSearchCached({
      search: "%%",
      first: 4,
      after: "WyJpZCJd",
    });
    expect(fetchCatalogProductSearch).not.toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it("ends the list instead of sending a D1 cursor to pg_graphql", async () => {
    jest.mocked(isCatalogD1Enabled).mockReturnValue(true);
    jest.mocked(fetchCatalogProductSearch).mockRejectedValue(new Error("down"));
    const result = await fetchProductSearchCached({
      search: "%%",
      first: 4,
      after: "8",
    });
    expect(result.productsCollection).toEqual({
      edges: [],
      pageInfo: { hasNextPage: false, endCursor: null },
    });
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe("fetchFeaturedProductsCached", () => {
  it("serves the D1 mirror when enabled", async () => {
    jest.mocked(isCatalogD1Enabled).mockReturnValue(true);
    jest
      .mocked(fetchCatalogFeaturedProducts)
      .mockResolvedValue(mirrorPage as never);
    await expect(fetchFeaturedProductsCached({ first: 4 })).resolves.toEqual(
      mirrorPage,
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("falls back to Supabase when the mirror fails", async () => {
    jest.mocked(isCatalogD1Enabled).mockReturnValue(true);
    jest
      .mocked(fetchCatalogFeaturedProducts)
      .mockRejectedValue(new Error("down"));
    await expect(fetchFeaturedProductsCached({ first: 4 })).resolves.toEqual(
      supabasePage,
    );
  });
});
