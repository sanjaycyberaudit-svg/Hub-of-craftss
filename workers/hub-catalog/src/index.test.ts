/** @jest-environment node */
import worker, { runSync, type D1Database, type Env } from "./index";
import {
  computeEffectivePrice,
  toPaise,
  type SupabaseCollectionRow,
  type SupabaseProductRow,
} from "./catalog";

type SqliteStatement = {
  run: (...params: unknown[]) => { changes: number | bigint };
  all: (...params: unknown[]) => Record<string, unknown>[];
  get: (...params: unknown[]) => Record<string, unknown> | undefined;
};
type SqliteDb = {
  prepare: (sql: string) => SqliteStatement;
  exec: (sql: string) => void;
  close: () => void;
};

const { DatabaseSync } = (
  process as unknown as {
    getBuiltinModule: (id: string) => {
      DatabaseSync: new (path: string) => SqliteDb;
    };
  }
).getBuiltinModule("node:sqlite");

/** Minimal D1 binding over real SQLite; batch() is one transaction like D1. */
function createD1(db: SqliteDb): D1Database {
  const prepare = (sql: string, params: unknown[] = []) => {
    const runSync = () => {
      const result = db.prepare(sql).run(...params);
      return { results: [], meta: { changes: Number(result.changes) } };
    };
    const statement = {
      bind: (...values: unknown[]) => prepare(sql, values),
      run: async () => runSync(),
      all: async <T>() => ({
        results: db
          .prepare(sql)
          .all(...params)
          .map((row) => ({ ...row })) as T[],
      }),
      first: async <T>() => {
        const row = db.prepare(sql).get(...params);
        return (row ? { ...row } : null) as T | null;
      },
      runSync,
    };
    return statement;
  };
  return {
    prepare: (sql) => prepare(sql),
    batch: async (statements) => {
      db.exec("BEGIN");
      try {
        const results = statements.map((s) =>
          (s as unknown as { runSync: () => unknown }).runSync(),
        );
        db.exec("COMMIT");
        return results as never;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

const SECRET = "test-sync-secret";
const SUPABASE_URL = "https://example-hub.supabase.co";

function product(
  overrides: Partial<SupabaseProductRow> & { id: string },
): SupabaseProductRow {
  return {
    name: `Product ${overrides.id}`,
    slug: `product-${overrides.id}`,
    description: null,
    rating: "4.0",
    badge: null,
    price: "1000.00",
    discount_enabled: false,
    discount_percent: null,
    stock: 8,
    featured: false,
    created_at: "2026-01-01T00:00:00+00:00",
    collection_id: "col-mugs",
    featured_image_id: `media-${overrides.id}`,
    medias: { key: `products/${overrides.id}.webp`, alt: "alt" },
    ...overrides,
  };
}

function collection(
  overrides: Partial<SupabaseCollectionRow> & { id: string },
): SupabaseCollectionRow {
  return {
    label: `Label ${overrides.id}`,
    slug: overrides.id,
    title: `Title ${overrides.id}`,
    description: "",
    order: null,
    featured_image_id: `media-${overrides.id}`,
    medias: { key: `collections/${overrides.id}.webp`, alt: "c" },
    ...overrides,
  };
}

let sqlite: SqliteDb;
let env: Env;
let supabaseProducts: SupabaseProductRow[];
let supabaseCollections: SupabaseCollectionRow[];
let supabaseFailure: number | null;
let requestedUrls: string[];

/** Stand-in for the Postgres locale collation (unlike SQLite's byte order). */
const postgresNameOrder = (a: SupabaseProductRow, b: SupabaseProductRow) =>
  a.name.localeCompare(b.name, "en") || a.id.localeCompare(b.id);

function page<T>(rows: T[], url: URL) {
  const limit = Number(url.searchParams.get("limit"));
  const offset = Number(url.searchParams.get("offset"));
  const ordered = url.searchParams.get("order")?.startsWith("name")
    ? [...(rows as unknown as SupabaseProductRow[])].sort(postgresNameOrder)
    : rows;
  return (ordered as T[]).slice(offset, offset + limit);
}

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  env = {
    DB: createD1(sqlite),
    CATALOG_SYNC_SECRET: SECRET,
    SUPABASE_URL,
    SUPABASE_ANON_KEY: "anon",
  };
  supabaseCollections = [
    collection({
      id: "col-mugs",
      label: "Mugs",
      title: "Coffee mugs",
      order: 5,
    }),
    collection({ id: "col-bags", label: "Bags", title: "Jute bags", order: 9 }),
    collection({ id: "col-misc", label: "Misc", title: "Misc", order: null }),
  ];
  supabaseProducts = [
    product({
      id: "p1",
      name: "Blue Mug",
      price: "499.00",
      created_at: "2026-01-03T00:00:00+00:00",
      featured: true,
    }),
    product({
      id: "p2",
      name: "red mug",
      price: "1000.00",
      discount_enabled: true,
      discount_percent: 20,
      created_at: "2026-01-02T00:00:00+00:00",
      featured: null,
    }),
    product({
      id: "p3",
      name: "Tote",
      description: "Sturdy jute tote",
      collection_id: "col-bags",
      price: "750.00",
      created_at: "2026-01-04T00:00:00+00:00",
    }),
    product({
      id: "p4",
      name: "Loose Coaster",
      collection_id: null,
      price: "600.00",
      created_at: "2026-01-05T00:00:00+00:00",
      featured: true,
    }),
  ];
  supabaseFailure = null;
  requestedUrls = [];

  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    requestedUrls.push(url.toString());
    if (supabaseFailure) {
      return new Response("boom", { status: supabaseFailure });
    }
    if (url.pathname === "/rest/v1/products") {
      return Response.json(page(supabaseProducts, url));
    }
    if (url.pathname === "/rest/v1/collections") {
      return Response.json(page(supabaseCollections, url));
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
});

afterEach(() => {
  sqlite.close();
  jest.restoreAllMocks();
});

async function call(path: string, init: RequestInit = {}, auth = true) {
  const headers = new Headers(init.headers);
  if (auth) headers.set("authorization", `Bearer ${SECRET}`);
  const res = await worker.fetch(
    new Request(`https://hub-catalog.test${path}`, { ...init, headers }),
    env,
  );
  return { status: res.status, body: (await res.json()) as any };
}

const ids = (body: any) =>
  body.productsCollection.edges.map((e: any) => e.node.id);

describe("price maths matches Postgres effectivePriceSql", () => {
  it("parses decimal text without float drift", () => {
    expect(toPaise("1299.00")).toBe(129900);
    expect(toPaise("0.1")).toBe(10);
    expect(toPaise(19.99)).toBe(1999);
  });

  it("rounds half away from zero at paise and rupee steps", () => {
    expect(computeEffectivePrice(99900, true, 33)).toEqual({
      paise: 66933,
      rupees: 669,
    });
    // ROUND(1.01 * 0.5, 2) = 0.51 in Postgres
    expect(computeEffectivePrice(101, true, 50).paise).toBe(51);
    expect(computeEffectivePrice(49950, false, null).rupees).toBe(500);
    // Out-of-range percentages are ignored like the SQL CASE.
    expect(computeEffectivePrice(100000, true, 100).paise).toBe(100000);
    expect(computeEffectivePrice(100000, true, 0).paise).toBe(100000);
  });
});

describe("sync", () => {
  it("mirrors published products only and records meta", async () => {
    const { status, body } = await call("/sync", { method: "POST" });
    expect(status).toBe(200);
    expect(body).toMatchObject({ ok: true, status: "synced" });
    expect(body.passes[0]).toMatchObject({
      products: 4,
      collections: 3,
      upserted: 7,
    });

    const productUrl = requestedUrls.find((u) =>
      u.includes("/rest/v1/products"),
    )!;
    expect(productUrl).toContain("is_draft=eq.false");
    expect(decodeURIComponent(productUrl)).toContain(
      "medias!featured_image(key,alt)",
    );
    expect(productUrl.startsWith(SUPABASE_URL)).toBe(true);

    const health = await call("/health", {}, false);
    expect(health.body.meta).toMatchObject({
      product_count: "4",
      collection_count: "3",
    });
    expect(health.body.meta.sync_lease).toBeUndefined();
  });

  it("writes only changed rows on later syncs", async () => {
    await runSync(env);
    const unchanged = await runSync(env);
    expect(unchanged).toMatchObject({ ok: true, status: "synced" });
    expect((unchanged as any).passes[0]).toMatchObject({
      upserted: 0,
      deleted: 0,
    });

    supabaseProducts[0] = { ...supabaseProducts[0], price: "549.00" };
    const repriced = await runSync(env);
    expect((repriced as any).passes[0]).toMatchObject({
      upserted: 1,
      deleted: 0,
    });
    const row = sqlite
      .prepare("SELECT price, price_paise FROM products WHERE id = 'p1'")
      .get();
    expect(row).toMatchObject({ price: "549.00", price_paise: 54900 });

    // Removing the last product by name shifts no other product's name_rank.
    const lastByName = [...supabaseProducts].sort(postgresNameOrder).at(-1)!.id;
    supabaseProducts = supabaseProducts.filter((p) => p.id !== lastByName);
    const removed = await runSync(env);
    expect((removed as any).passes[0]).toMatchObject({
      upserted: 0,
      deleted: 1,
    });
    expect(
      sqlite.prepare("SELECT id FROM products WHERE id = ?").get(lastByName),
    ).toBeUndefined();
  });

  it("pages through Supabase beyond 1000 rows", async () => {
    supabaseProducts = Array.from({ length: 1003 }, (_, i) =>
      product({ id: `bulk-${String(i).padStart(4, "0")}` }),
    );
    const outcome = await runSync(env);
    expect((outcome as any).passes[0].products).toBe(1003);
    expect(requestedUrls.some((u) => u.includes("offset=1000"))).toBe(true);
    expect(
      sqlite.prepare("SELECT COUNT(*) AS n FROM products").get(),
    ).toMatchObject({ n: 1003 });
  });

  it("refuses to wipe the mirror when Supabase returns nothing", async () => {
    await runSync(env);
    supabaseProducts = [];
    const guarded = await runSync(env);
    expect(guarded).toMatchObject({ ok: false });
    expect(
      sqlite.prepare("SELECT COUNT(*) AS n FROM products").get(),
    ).toMatchObject({ n: 4 });

    const forced = await runSync(env, { allowEmpty: true });
    expect(forced).toMatchObject({ ok: true });
    expect(
      sqlite.prepare("SELECT COUNT(*) AS n FROM products").get(),
    ).toMatchObject({ n: 0 });
  });

  it("keeps the last good mirror and records the error when Supabase fails", async () => {
    await runSync(env);
    supabaseFailure = 503;
    const { status, body } = await call("/sync", { method: "POST" });
    expect(status).toBe(502);
    expect(body.ok).toBe(false);
    const health = await call("/health", {}, false);
    expect(health.body.meta.last_error).toContain("503");
    expect(health.body.meta.product_count).toBe("4");

    supabaseFailure = null;
    await runSync(env);
    const recovered = await call("/health", {}, false);
    expect(recovered.body.meta.last_error).toBeUndefined();
  });

  it("queues a second sync while one holds the lease, then runs it", async () => {
    await runSync(env);
    sqlite
      .prepare("UPDATE catalog_meta SET value = ? WHERE key = 'sync_lease'")
      .run(String(Date.now() + 60_000));
    expect(await runSync(env)).toEqual({ ok: true, status: "queued" });
    expect(
      sqlite
        .prepare("SELECT value FROM catalog_meta WHERE key = 'sync_pending'")
        .get(),
    ).toMatchObject({ value: "1" });

    sqlite
      .prepare("UPDATE catalog_meta SET value = '0' WHERE key = 'sync_lease'")
      .run();
    expect(await runSync(env)).toMatchObject({ ok: true, status: "synced" });
    expect(
      sqlite
        .prepare("SELECT value FROM catalog_meta WHERE key = 'sync_pending'")
        .get(),
    ).toBeUndefined();
  });

  it("adds name_rank to a mirror created before the column existed", async () => {
    sqlite.exec(`CREATE TABLE products (
      id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, slug TEXT NOT NULL,
      description TEXT, rating TEXT NOT NULL, badge TEXT, price TEXT NOT NULL,
      price_paise INTEGER NOT NULL, effective_paise INTEGER NOT NULL,
      effective_rupees INTEGER NOT NULL, discount_enabled INTEGER NOT NULL,
      discount_percent INTEGER, stock INTEGER, featured INTEGER,
      created_at TEXT NOT NULL, created_at_ms INTEGER NOT NULL, collection_id TEXT,
      image_id TEXT NOT NULL, image_key TEXT, image_alt TEXT, row_hash TEXT NOT NULL)`);
    expect(await runSync(env)).toMatchObject({ ok: true, status: "synced" });
    expect(
      sqlite
        .prepare("SELECT COUNT(*) AS n FROM products WHERE name_rank >= 0")
        .get(),
    ).toMatchObject({ n: 4 });
  });

  it("runs from the cron trigger", async () => {
    const waits: Promise<unknown>[] = [];
    await worker.scheduled({}, env, { waitUntil: (p) => waits.push(p) });
    await Promise.all(waits);
    expect(
      sqlite.prepare("SELECT COUNT(*) AS n FROM products").get(),
    ).toMatchObject({ n: 4 });
  });
});

describe("reads", () => {
  it("requires the bearer secret except for /health", async () => {
    expect((await call("/collections", {}, false)).status).toBe(401);
    expect((await call("/sync", { method: "POST" }, false)).status).toBe(401);
    expect((await call("/health", {}, false)).status).toBe(200);
  });

  it("returns 503 before the first sync so callers fall back", async () => {
    const { status, body } = await call("/products/search");
    expect(status).toBe(503);
    expect(body.error).toBe("not_synced");
  });

  describe("after sync", () => {
    beforeEach(async () => {
      await runSync(env);
    });

    it("lists collections like AllCollectionsQuery (order desc, nulls last)", async () => {
      const { body } = await call("/collections");
      expect(body.checkedAt).toEqual(expect.any(String));
      expect(
        body.collectionsCollection.edges.map((e: any) => e.node.id),
      ).toEqual(["col-bags", "col-mugs", "col-misc"]);
      expect(body.collectionsCollection.edges[0].node).toEqual({
        id: "col-bags",
        label: "Bags",
        slug: "col-bags",
        featuredImage: { key: "collections/col-bags.webp", alt: "c" },
      });
    });

    it("lists featured products newest first with offset cursors", async () => {
      const first = await call("/products/featured?first=1");
      expect(ids(first.body)).toEqual(["p4"]);
      expect(first.body.productsCollection.pageInfo).toEqual({
        hasNextPage: true,
        endCursor: "1",
      });
      const second = await call("/products/featured?first=1&offset=1");
      expect(ids(second.body)).toEqual(["p1"]);
      expect(second.body.productsCollection.pageInfo.hasNextPage).toBe(false);
    });

    it("returns ProductCardFragment-shaped nodes", async () => {
      const { body } = await call("/products/search?q=blue");
      expect(body.productsCollection.edges[0].node).toEqual({
        id: "p1",
        name: "Blue Mug",
        description: null,
        rating: "4.0",
        slug: "product-p1",
        badge: null,
        price: "499.00",
        discountEnabled: false,
        discountPercent: null,
        stock: 8,
        featuredImage: { id: "media-p1", key: "products/p1.webp", alt: "alt" },
        collections: { id: "col-mugs", label: "Mugs", slug: "col-mugs" },
      });
    });

    it("defaults to primary-key order and includes uncategorized products (GraphQL search)", async () => {
      const { body } = await call("/products/search");
      expect(ids(body)).toEqual(["p1", "p2", "p3", "p4"]);
      expect(body.matchingCollections).toEqual([]);
    });

    it("matches collection names like findMatchingCollections", async () => {
      const { body } = await call("/products/search?q=jute");
      expect(body.matchingCollections.map((c: any) => c.id)).toEqual([
        "col-bags",
      ]);
      expect(ids(body)).toEqual(["p3"]);

      const mugs = await call("/products/search?q=coffee");
      expect(ids(mugs.body)).toEqual(["p1", "p2"]);
    });

    it("searches case-insensitively and scopes by collection", async () => {
      const { body } = await call(
        "/products/search?q=MUG&collections=col-mugs",
      );
      expect(ids(body)).toEqual(["p1", "p2"]);
      const none = await call("/products/search?q=mug&collections=col-bags");
      expect(ids(none.body)).toEqual([]);
    });

    it("orders BEST_MATCH with null featured first, then newest", async () => {
      const { body } = await call("/products/search?sort=best_match");
      expect(ids(body)).toEqual(["p2", "p4", "p1", "p3"]);
    });

    it("sorts by name in Postgres collation order, not SQLite byte order", async () => {
      supabaseProducts = [
        product({ id: "n1", name: "Banana box" }),
        product({ id: "n2", name: "6*6 square stone" }),
        product({ id: "n3", name: "apple tray" }),
        product({ id: "n4", name: "6-Piece chisel" }),
      ];
      await runSync(env);
      const expected = [...supabaseProducts]
        .sort(postgresNameOrder)
        .map((p) => p.id);
      const byteOrder = [...supabaseProducts]
        .sort((a, b) => (a.name < b.name ? -1 : 1))
        .map((p) => p.id);
      expect(expected).not.toEqual(byteOrder);

      const { body } = await call("/products/search?sort=name_asc");
      expect(ids(body)).toEqual(expected);
      const priced = await call(
        "/products/search?sort=name_asc&price_min=0&price_max=5000",
      );
      expect(ids(priced.body)).toEqual(expected);
    });

    it("sorts GraphQL search by list price, not sale price", async () => {
      const { body } = await call("/products/search?sort=price_asc");
      expect(ids(body)).toEqual(["p1", "p4", "p3", "p2"]);
    });

    it("price buckets use rounded effective price and require a category", async () => {
      const { body } = await call(
        "/products/search?price_min=700&price_max=999",
      );
      // p2: 1000 - 20% = 800 → in; p4 (600, uncategorized) and p1 (499) → out
      expect(ids(body).sort()).toEqual(["p2", "p3"]);

      const sorted = await call(
        "/products/search?price_min=0&price_max=5000&sort=price_asc",
      );
      expect(ids(sorted.body)).toEqual(["p1", "p3", "p2"]);
    });

    it("returns an empty page for an inverted price range", async () => {
      const { body } = await call(
        "/products/search?price_min=900&price_max=100",
      );
      expect(body.productsCollection).toEqual({
        edges: [],
        pageInfo: { hasNextPage: false, endCursor: null },
      });
    });

    it("paginates search with offset cursors", async () => {
      const first = await call("/products/search?first=3");
      expect(ids(first.body)).toEqual(["p1", "p2", "p3"]);
      expect(first.body.productsCollection.pageInfo).toEqual({
        hasNextPage: true,
        endCursor: "3",
      });
      const next = await call("/products/search?first=3&offset=3");
      expect(ids(next.body)).toEqual(["p4"]);
    });

    it("rejects queries D1 cannot answer identically (caller falls back)", async () => {
      expect((await call(`/products/search?q=${"x".repeat(49)}`)).status).toBe(
        422,
      );
      expect((await call("/products/search?q=a%5Cb")).status).toBe(422);
      expect((await call("/products/search?sort=random")).status).toBe(422);
      expect((await call("/products/search?first=500")).status).toBe(422);
    });
  });
});
