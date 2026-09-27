/** @jest-environment node */
jest.mock("server-only", () => ({}));
jest.mock("next/server", () => ({ after: jest.fn() }));
jest.mock("../cache/storefront-pages", () => ({
  revalidateProductListPages: jest.fn(),
}));
jest.mock("../cache/edge-cache", () => ({
  purgeEdgeCacheTags: jest.fn(async () => undefined),
}));
jest.mock("../cache/redis", () => ({
  redisDelByPrefix: jest.fn(async () => undefined),
}));
jest.mock("../cache/storefront-cache", () => ({
  clearStorefrontMemoryCache: jest.fn(),
}));

import { after } from "next/server";
import { redisDelByPrefix } from "../cache/redis";
import { parseProductListRequest } from "../storefront/search-params";
import type { StorefrontProductSearchVariables } from "../storefront/search-params";
import {
  canServeFromCatalogMirror,
  fetchCatalogCollections,
  fetchCatalogFeaturedProducts,
  fetchCatalogProductSearch,
  getCatalogReadSource,
  isCatalogD1Enabled,
  isOffsetCursor,
  mapOrderByToCatalogSort,
  scheduleCatalogMirrorSync,
  syncCatalogMirror,
} from "./d1-mirror";

const WORKER_URL = "https://hub-catalog.example.workers.dev";
const ORIGINAL_ENV = { ...process.env };
let fetchMock: jest.Mock;

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

const freshAt = () => new Date().toISOString();

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    CATALOG_READ: "d1",
    CATALOG_WORKER_URL: `${WORKER_URL}/`,
    CATALOG_SYNC_SECRET: "s3cret",
  };
  delete process.env.CATALOG_MAX_STALENESS_MINUTES;
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  jest.mocked(after).mockReset();
  jest.mocked(redisDelByPrefix).mockClear();
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe("flag and configuration", () => {
  it("defaults to Supabase", () => {
    delete process.env.CATALOG_READ;
    expect(getCatalogReadSource()).toBe("supabase");
    expect(isCatalogD1Enabled()).toBe(false);
  });

  it("stays off when the worker is not fully configured", () => {
    delete process.env.CATALOG_SYNC_SECRET;
    expect(isCatalogD1Enabled()).toBe(false);
  });

  it("refuses plain-http remote worker URLs", () => {
    process.env.CATALOG_WORKER_URL = "http://hub-catalog.example.workers.dev";
    expect(isCatalogD1Enabled()).toBe(false);
    process.env.CATALOG_WORKER_URL = "http://localhost:8787";
    expect(isCatalogD1Enabled()).toBe(true);
  });
});

describe("cursors", () => {
  it("only offset cursors can be resumed by the mirror", () => {
    expect(isOffsetCursor("24")).toBe(true);
    expect(isOffsetCursor("WyJpZCJd")).toBe(false);
    expect(isOffsetCursor(undefined)).toBe(false);
    expect(canServeFromCatalogMirror(undefined)).toBe(true);
    expect(canServeFromCatalogMirror("48")).toBe(true);
    expect(canServeFromCatalogMirror("WyJpZCJd")).toBe(false);
  });
});

describe("mapOrderByToCatalogSort", () => {
  it.each([
    ["BEST_MATCH", "best_match"],
    ["PRICE_LOW_TO_HIGH", "price_asc"],
    ["PRICE_HIGH_TO_LOW", "price_desc"],
    ["NEWEST", "newest"],
    ["NAME_ASCE", "name_asc"],
    ["", null],
  ])("maps shop sort %s to %s", (sort, expected) => {
    const params = new URLSearchParams(sort ? { sort } : {});
    const { variables } = parseProductListRequest(params);
    expect(
      mapOrderByToCatalogSort(
        (variables as StorefrontProductSearchVariables).orderBy,
      ),
    ).toBe(expected);
  });
});

describe("fetchCatalogProductSearch", () => {
  const products = {
    edges: [{ node: { id: "p1" } }],
    pageInfo: { hasNextPage: true, endCursor: "4" },
  };

  it("translates storefront variables into the worker query", async () => {
    fetchMock.mockResolvedValue(
      respond({
        checkedAt: freshAt(),
        productsCollection: products,
        matchingCollections: [],
      }),
    );
    const variables = parseProductListRequest(
      new URLSearchParams({
        search: "jute bag",
        price_range: "500-999",
        collections: JSON.stringify(["c1", "c2"]),
        sort: "PRICE_LOW_TO_HIGH",
        first: "4",
        after: "8",
      }),
    ).variables as StorefrontProductSearchVariables;

    const result = await fetchCatalogProductSearch(variables);

    expect(result.productsCollection).toEqual(products);
    const [url, init] = fetchMock.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      `${WORKER_URL}/products/search`,
    );
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      q: "jute bag",
      collections: "c1,c2",
      price_min: "500",
      price_max: "999",
      sort: "price_asc",
      first: "4",
      offset: "8",
    });
    expect(init.headers.Authorization).toBe("Bearer s3cret");
    expect(init.cache).toBeUndefined();
  });

  it("bypasses Next's patched fetch so ISR pages stay static", async () => {
    const original = jest.fn(async () =>
      respond({ checkedAt: freshAt(), productsCollection: products }),
    );
    const patched = jest.fn() as unknown as typeof fetch & {
      _nextOriginalFetch?: typeof fetch;
    };
    patched._nextOriginalFetch = original as unknown as typeof fetch;
    global.fetch = patched;

    await fetchCatalogProductSearch({ search: "jute", first: 4 });

    expect(original).toHaveBeenCalledTimes(1);
    expect(patched).not.toHaveBeenCalled();
  });

  it("omits the term for the match-all search", async () => {
    fetchMock.mockResolvedValue(
      respond({ checkedAt: freshAt(), productsCollection: products }),
    );
    await fetchCatalogProductSearch({ search: "%%", first: 4 });
    const parsed = new URL(fetchMock.mock.calls[0][0]);
    expect(parsed.searchParams.has("q")).toBe(false);
    expect(parsed.searchParams.get("offset")).toBe("0");
  });

  it("rejects a mirror that has not synced recently", async () => {
    process.env.CATALOG_MAX_STALENESS_MINUTES = "30";
    fetchMock.mockResolvedValue(
      respond({
        checkedAt: new Date(Date.now() - 31 * 60_000).toISOString(),
        productsCollection: products,
      }),
    );
    await expect(
      fetchCatalogProductSearch({ search: "%%", first: 4 }),
    ).rejects.toThrow(/stale/);
  });

  it("rejects unsupported, unsynced and malformed responses", async () => {
    fetchMock.mockResolvedValueOnce(
      respond({ error: "unsupported_query" }, 422),
    );
    await expect(
      fetchCatalogProductSearch({ search: "%x%", first: 4 }),
    ).rejects.toThrow(/422 unsupported_query/);
    fetchMock.mockResolvedValueOnce(respond({ error: "not_synced" }, 503));
    await expect(
      fetchCatalogProductSearch({ search: "%x%", first: 4 }),
    ).rejects.toThrow(/503/);
    fetchMock.mockResolvedValueOnce(
      respond({ checkedAt: freshAt(), productsCollection: {} }),
    );
    await expect(
      fetchCatalogProductSearch({ search: "%x%", first: 4 }),
    ).rejects.toThrow(/malformed/);
    fetchMock.mockRejectedValueOnce(
      new Error("The operation was aborted due to timeout"),
    );
    await expect(
      fetchCatalogProductSearch({ search: "%x%", first: 4 }),
    ).rejects.toThrow(/unavailable/);
  });
});

describe("featured and collections", () => {
  it("fetches featured with offset paging", async () => {
    fetchMock.mockResolvedValue(
      respond({
        checkedAt: freshAt(),
        productsCollection: {
          edges: [],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      }),
    );
    await fetchCatalogFeaturedProducts({ first: 8, after: "16" });
    const parsed = new URL(fetchMock.mock.calls[0][0]);
    expect(parsed.pathname).toBe("/products/featured");
    expect(parsed.searchParams.get("offset")).toBe("16");
  });

  it("returns the collections connection", async () => {
    const connection = {
      edges: [
        {
          node: { id: "c1", label: "Mugs", slug: "mugs", featuredImage: null },
        },
      ],
    };
    fetchMock.mockResolvedValue(
      respond({ checkedAt: freshAt(), collectionsCollection: connection }),
    );
    await expect(fetchCatalogCollections()).resolves.toEqual(connection);
  });
});

describe("sync", () => {
  it("skips quietly when the worker is not configured", async () => {
    delete process.env.CATALOG_WORKER_URL;
    await expect(syncCatalogMirror()).resolves.toEqual({
      ok: true,
      skipped: true,
    });
    scheduleCatalogMirrorSync();
    expect(after).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports whether the mirror changed", async () => {
    fetchMock.mockResolvedValue(
      respond({
        ok: true,
        status: "synced",
        passes: [{ upserted: 0, deleted: 1 }],
      }),
    );
    await expect(syncCatalogMirror()).resolves.toEqual({
      ok: true,
      skipped: false,
      changed: true,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${WORKER_URL}/sync`);
    expect(init.method).toBe("POST");
  });

  it("never throws when the worker fails", async () => {
    fetchMock.mockResolvedValueOnce(respond({ ok: false, error: "boom" }, 502));
    await expect(syncCatalogMirror()).resolves.toMatchObject({ ok: false });
    fetchMock.mockRejectedValueOnce(new Error("fetch failed"));
    await expect(syncCatalogMirror()).resolves.toMatchObject({ ok: false });
  });

  it("runs after the response and clears mirror caches only when rows changed", async () => {
    fetchMock.mockResolvedValue(
      respond({
        ok: true,
        status: "synced",
        passes: [{ upserted: 2, deleted: 0 }],
      }),
    );
    scheduleCatalogMirrorSync();
    expect(after).toHaveBeenCalledTimes(1);
    await (jest.mocked(after).mock.calls[0][0] as () => Promise<void>)();
    expect(redisDelByPrefix).toHaveBeenCalledWith("sf:products:d1:");
    expect(redisDelByPrefix).toHaveBeenCalledWith("sf:collection:d1:");

    jest.mocked(redisDelByPrefix).mockClear();
    fetchMock.mockResolvedValue(
      respond({
        ok: true,
        status: "synced",
        passes: [{ upserted: 0, deleted: 0 }],
      }),
    );
    scheduleCatalogMirrorSync();
    await (jest.mocked(after).mock.calls[1][0] as () => Promise<void>)();
    expect(redisDelByPrefix).not.toHaveBeenCalled();
  });

  it("falls back to a detached run outside a request scope", async () => {
    jest.mocked(after).mockImplementation(() => {
      throw new Error("after was called outside a request scope");
    });
    fetchMock.mockResolvedValue(respond({ ok: true, status: "queued" }));
    expect(() => scheduleCatalogMirrorSync()).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchMock).toHaveBeenCalledWith(
      `${WORKER_URL}/sync`,
      expect.anything(),
    );
  });
});
