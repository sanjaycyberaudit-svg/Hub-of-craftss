/** @jest-environment node */

const mockRedis = new Map<string, unknown>();
let mockProductRows: { id: string; slug: string; featured: boolean | null }[] =
  [];

jest.mock("./redis", () => ({
  isRedisCacheEnabled: () => true,
  redisGet: jest.fn(async (key: string) => mockRedis.get(key) ?? null),
  redisSet: jest.fn(async (key: string, value: unknown) => {
    mockRedis.set(key, value);
  }),
  redisDel: jest.fn(async (keys: string[]) => {
    keys.forEach((key) => mockRedis.delete(key));
  }),
  redisDelByPrefix: jest.fn(async (prefix: string) => {
    [...mockRedis.keys()]
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => mockRedis.delete(key));
  }),
}));
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));
jest.mock("@vercel/functions", () => ({
  dangerouslyDeleteByTag: jest.fn(async () => undefined),
}));
jest.mock("drizzle-orm", () => ({
  inArray: (_column: unknown, ids: string[]) => ({ ids }),
}));
jest.mock("../supabase/schema", () => ({
  products: { id: "id", slug: "slug", featured: "featured" },
}));
jest.mock("../supabase/db", () => ({
  __esModule: true,
  default: {
    select: () => ({
      from: () => ({
        where: async ({ ids }: { ids: string[] }) =>
          mockProductRows.filter((row) => ids.includes(row.id)),
      }),
    }),
  },
}));
jest.mock("../catalog/d1-mirror", () => ({
  scheduleCatalogMirrorSync: jest.fn(),
}));
jest.mock("../admin/getAdminProductsList", () => ({
  ADMIN_PRODUCTS_LIST_TAG: "admin-products-list",
}));

import { dangerouslyDeleteByTag } from "@vercel/functions";
import { revalidatePath, revalidateTag } from "next/cache";
import { scheduleCatalogMirrorSync } from "../catalog/d1-mirror";
import {
  invalidateProductCaches,
  invalidateStorefrontCache,
} from "./invalidate-storefront";
import { withStorefrontCache } from "./storefront-cache";

const SUFFIX = "|v2";

const P1_OWN = ["sf:product:jute-bag", "sf:published:jute-bag", "sf:size:p1"];
const LISTS = [
  "sf:products:search:{}",
  "sf:products:d1:search:{q:jute}",
  "sf:products:featured:{}",
  "sf:products:suggest:jut:8",
  "sf:collection:bags:bags",
  "sf:collection:d1:all",
  "sf:collections:all",
  "sf:landing:v2",
  "sf:recommendations:featured:4",
  "sf:recommendations:4",
  "sf:shop-by-price",
  "sf:drafts",
];
const SIZE_BATCH = ["sf:size:batch:p1,p2"];
const OTHER_PRODUCT = [
  "sf:product:clay-pot",
  "sf:published:clay-pot",
  "sf:size:p2",
];
const NOT_PRODUCT = [
  "sf:runtime-bundle",
  "sf:home-banner",
  "sf:pincode:600001",
];

function seed(keys: string[]) {
  keys.forEach((key) => mockRedis.set(key + SUFFIX, { __swr: 1 }));
}

function remaining() {
  return [...mockRedis.keys()].map((key) => key.slice(0, -SUFFIX.length));
}

const pathCalls = () => jest.mocked(revalidatePath).mock.calls;
const tagCalls = () =>
  jest.mocked(revalidateTag).mock.calls.map(([tag]) => tag);
const edgeTags = () =>
  jest.mocked(dangerouslyDeleteByTag).mock.calls.flatMap(([tags]) => tags);

beforeEach(() => {
  mockRedis.clear();
  mockProductRows = [
    { id: "p1", slug: "jute-bag", featured: false },
    { id: "p2", slug: "clay-pot", featured: true },
  ];
  jest.clearAllMocks();
  seed([...P1_OWN, ...LISTS, ...SIZE_BATCH, ...OTHER_PRODUCT, ...NOT_PRODUCT]);
});

describe("invalidateProductCaches", () => {
  it("clears only the product's own entries and shared lists", async () => {
    await invalidateProductCaches({ productIds: ["p1"] });

    expect(remaining().sort()).toEqual(
      [...OTHER_PRODUCT, ...NOT_PRODUCT].sort(),
    );
  });

  it("revalidates this product's page and list pages, not other product pages", async () => {
    await invalidateProductCaches({ productIds: ["p1"] });

    expect(pathCalls()).toEqual(
      expect.arrayContaining([
        ["/shop/jute-bag", undefined],
        ["/", undefined],
        ["/shop", undefined],
        ["/featured", undefined],
        ["/collections", undefined],
        ["/collections/[collectionSlug]", "page"],
      ]),
    );
    expect(pathCalls()).not.toContainEqual(["/shop/clay-pot", undefined]);
    expect(pathCalls()).not.toContainEqual(["/shop/[slug]", "page"]);
    expect(pathCalls()).not.toContainEqual(["/", "layout"]);
  });

  it("revalidates only this product's Data Cache tags plus list tags", async () => {
    await invalidateProductCaches({ productIds: ["p1"] });

    expect(tagCalls()).toEqual(
      expect.arrayContaining([
        "storefront-product:jute-bag",
        "storefront-size:p1",
        "storefront-size-batch",
        "storefront-products",
        "storefront-product-drafts",
        "storefront-collections",
      ]),
    );
    expect(tagCalls()).not.toContain("storefront-product:clay-pot");
    expect(tagCalls()).not.toContain("storefront-product-details");
    expect(tagCalls()).not.toContain("storefront-settings");
  });

  it("purges only this product's and list edge tags, then syncs D1", async () => {
    await invalidateProductCaches({ productIds: ["p1"] });

    expect(edgeTags().sort()).toEqual(["sf-product-lists", "sf-product-p1"]);
    expect(scheduleCatalogMirrorSync).toHaveBeenCalledTimes(1);
  });

  it("rebuilds every product page when a featured product changes (shared strip)", async () => {
    await invalidateProductCaches({ productIds: ["p2"] });

    expect(pathCalls()).toContainEqual(["/shop/[slug]", "page"]);
  });

  it("rebuilds product pages when a product stops being featured", async () => {
    await invalidateProductCaches({
      productIds: ["p1"],
      previous: [{ id: "p1", slug: "jute-bag", featured: true }],
    });

    expect(pathCalls()).toContainEqual(["/shop/[slug]", "page"]);
  });

  it("finds a deleted product through the identity read before the delete", async () => {
    mockProductRows = mockProductRows.filter((row) => row.id !== "p1");

    await invalidateProductCaches({
      productIds: ["p1"],
      previous: [{ id: "p1", slug: "jute-bag", featured: false }],
    });

    expect(remaining()).not.toContain("sf:product:jute-bag");
    expect(remaining()).not.toContain("sf:published:jute-bag");
    expect(pathCalls()).toContainEqual(["/shop/jute-bag", undefined]);
  });

  it("leaves lists and D1 alone for product-page-only changes", async () => {
    await invalidateProductCaches({ productIds: ["p1"], lists: false });

    expect(remaining().sort()).toEqual(
      [...LISTS, ...OTHER_PRODUCT, ...NOT_PRODUCT].sort(),
    );
    expect(edgeTags()).toEqual(["sf-product-p1"]);
    expect(scheduleCatalogMirrorSync).not.toHaveBeenCalled();
    expect(pathCalls()).not.toContainEqual(["/", undefined]);
  });

  it("does nothing without product ids", async () => {
    await invalidateProductCaches({ productIds: [] });

    expect(mockRedis.size).toBe(
      P1_OWN.length +
        LISTS.length +
        SIZE_BATCH.length +
        OTHER_PRODUCT.length +
        NOT_PRODUCT.length,
    );
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(dangerouslyDeleteByTag).not.toHaveBeenCalled();
  });

  it("drops this isolate's memory copy so the next read reloads", async () => {
    mockRedis.clear();
    let version = "old";
    const loader = jest.fn(async () => version);
    await withStorefrontCache("sf:product:jute-bag", loader, {
      revalidate: 1800,
    });

    version = "new";
    await invalidateProductCaches({ productIds: ["p1"] });

    expect(
      await withStorefrontCache("sf:product:jute-bag", loader, {
        revalidate: 1800,
      }),
    ).toBe("new");
  });
});

describe("invalidateStorefrontCache (full bust for settings/categories)", () => {
  it("clears every admin-owned entry but keeps pincode lookups", async () => {
    await invalidateStorefrontCache();

    expect(remaining()).toEqual(["sf:pincode:600001"]);
    expect(edgeTags()).toEqual(["sf-storefront"]);
    expect(pathCalls()).toContainEqual(["/", "layout"]);
  });
});
