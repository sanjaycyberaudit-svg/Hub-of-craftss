/**
 * hub-catalog — D1 read mirror of the Hub of craftss storefront catalog.
 * Supabase stays the source of truth; cart, checkout and PDP never read this.
 *
 * All routes except /health require `Authorization: Bearer CATALOG_SYNC_SECRET`.
 *   GET  /health
 *   POST /sync[?allowEmpty=1]   diff sync from Supabase (also runs on cron)
 *   GET  /collections
 *   GET  /products/featured?first&offset
 *   GET  /products/search?q&collections&price_min&price_max&sort&first&offset
 */

import {
  COLLECTION_COLUMNS,
  PRODUCT_COLUMNS,
  UnsupportedQueryError,
  buildCollectionMatchQuery,
  buildCollectionsListQuery,
  buildDeleteStatements,
  buildFeaturedQuery,
  buildProductSearchQuery,
  buildUpsertStatements,
  diffMirrorRows,
  parseProductSearchRequest,
  toCollectionCardNode,
  toCollectionMirrorRow,
  toPage,
  toProductCardNode,
  toProductMirrorRow,
  MAX_PAGE_SIZE,
  type CollectionCardQueryRow,
  type ProductCardQueryRow,
  type SqlStatement,
  type SupabaseCollectionRow,
  type SupabaseProductRow,
} from "./catalog";
import { SCHEMA_STATEMENTS } from "./schema";

export type D1Result<T> = { results: T[]; meta?: { changes?: number } };

export type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  run: () => Promise<D1Result<unknown>>;
  all: <T = Record<string, unknown>>() => Promise<D1Result<T>>;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
};

export type D1Database = {
  prepare: (query: string) => D1PreparedStatement;
  batch: (statements: D1PreparedStatement[]) => Promise<D1Result<unknown>[]>;
};

export interface Env {
  DB: D1Database;
  CATALOG_SYNC_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

type ExecutionContext = { waitUntil: (promise: Promise<unknown>) => void };

const SUPABASE_PAGE_SIZE = 1000;
const SUPABASE_MAX_PAGES = 50;
const SYNC_LEASE_MS = 120_000;
const MAX_SYNC_PASSES = 3;

const PRODUCT_SELECT =
  "id,name,slug,description,rating::text,badge,price::text,discount_enabled," +
  "discount_percent,stock,featured,created_at,collection_id,featured_image_id," +
  "medias!featured_image(key,alt)";
const COLLECTION_SELECT =
  "id,label,slug,title,description,order,featured_image_id," +
  "medias!featured_image(key,alt)";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function isAuthorized(request: Request, env: Env): boolean {
  const secret = env.CATALOG_SYNC_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return timingSafeEqual(token, secret);
}

function bindAll(db: D1Database, statements: SqlStatement[]) {
  return statements.map((s) => db.prepare(s.sql).bind(...s.params));
}

async function ensureSchema(env: Env) {
  await env.DB.batch(SCHEMA_STATEMENTS.map((sql) => env.DB.prepare(sql)));
  const { results } = await env.DB.prepare(
    "SELECT name FROM pragma_table_info('products')",
  ).all<{ name: string }>();
  if (!results.some((column) => column.name === "name_rank")) {
    await env.DB.prepare(
      "ALTER TABLE products ADD COLUMN name_rank INTEGER NOT NULL DEFAULT 0",
    ).run();
  }
}

async function readMeta(env: Env): Promise<Record<string, string>> {
  const { results } = await env.DB.prepare(
    "SELECT key, value FROM catalog_meta",
  ).all<{ key: string; value: string }>();
  return Object.fromEntries(results.map((row) => [row.key, row.value]));
}

async function fetchAllSupabaseRows<T>(
  env: Env,
  table: string,
  select: string,
  filter = "",
  order = "id.asc",
): Promise<T[]> {
  const base = env.SUPABASE_URL.replace(/\/+$/, "");
  const rows: T[] = [];
  for (let page = 0; page < SUPABASE_MAX_PAGES; page += 1) {
    const offset = page * SUPABASE_PAGE_SIZE;
    const url =
      `${base}/rest/v1/${table}?select=${encodeURIComponent(select)}` +
      `${filter ? `&${filter}` : ""}&order=${order}` +
      `&limit=${SUPABASE_PAGE_SIZE}&offset=${offset}`;
    const res = await fetch(url, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`supabase ${table} ${res.status}: ${text.slice(0, 300)}`);
    }
    const chunk = (await res.json()) as unknown;
    if (!Array.isArray(chunk)) {
      throw new Error(`supabase ${table}: expected an array`);
    }
    rows.push(...(chunk as T[]));
    if (chunk.length < SUPABASE_PAGE_SIZE) return rows;
  }
  throw new Error(`supabase ${table}: more than ${SUPABASE_MAX_PAGES} pages`);
}

async function readHashes(env: Env, table: "products" | "collections") {
  const { results } = await env.DB.prepare(
    `SELECT id, row_hash FROM ${table}`,
  ).all<{ id: string; row_hash: string }>();
  return new Map(results.map((row) => [row.id, row.row_hash]));
}

export class SyncGuardError extends Error {}

export type SyncPassResult = {
  products: number;
  collections: number;
  upserted: number;
  deleted: number;
};

async function runSyncPass(
  env: Env,
  options: { allowEmpty: boolean },
): Promise<SyncPassResult> {
  const [productRows, collectionRows, nameOrder] = await Promise.all([
    fetchAllSupabaseRows<SupabaseProductRow>(
      env,
      "products",
      PRODUCT_SELECT,
      "is_draft=eq.false",
    ),
    fetchAllSupabaseRows<SupabaseCollectionRow>(
      env,
      "collections",
      COLLECTION_SELECT,
    ),
    // SQLite cannot reproduce the Postgres collation, so let Postgres rank names.
    fetchAllSupabaseRows<{ id: string }>(
      env,
      "products",
      "id",
      "is_draft=eq.false",
      "name.asc,id.asc",
    ),
  ]);
  const nameRanks = new Map(nameOrder.map((row, index) => [row.id, index]));
  const [productHashes, collectionHashes] = await Promise.all([
    readHashes(env, "products"),
    readHashes(env, "collections"),
  ]);

  // A misconfigured key or RLS change returns [] — never wipe a good mirror for that.
  if (!options.allowEmpty) {
    if (productRows.length === 0 && productHashes.size > 0) {
      throw new SyncGuardError("supabase returned 0 products; mirror kept");
    }
    if (collectionRows.length === 0 && collectionHashes.size > 0) {
      throw new SyncGuardError("supabase returned 0 collections; mirror kept");
    }
  }

  const [products, collections] = await Promise.all([
    Promise.all(
      productRows.map((row, index) =>
        // A product published between the two reads sorts last until the next sync.
        toProductMirrorRow(
          row,
          nameRanks.get(row.id) ?? nameOrder.length + index,
        ),
      ),
    ),
    Promise.all(collectionRows.map(toCollectionMirrorRow)),
  ]);
  const productDiff = diffMirrorRows(productHashes, products);
  const collectionDiff = diffMirrorRows(collectionHashes, collections);
  const upserted = productDiff.upserts.length + collectionDiff.upserts.length;
  const deleted = productDiff.deletes.length + collectionDiff.deletes.length;
  const now = new Date().toISOString();

  const meta: SqlStatement[] = [
    ["checked_at", now],
    ["product_count", String(products.length)],
    ["collection_count", String(collections.length)],
    ...(upserted + deleted > 0 ? [["synced_at", now]] : []),
  ].map(([key, value]) => ({
    sql: "INSERT OR REPLACE INTO catalog_meta (key, value) VALUES (?, ?)",
    params: [key, value],
  }));

  // One batch = one transaction: readers never see a half-applied sync.
  await env.DB.batch(
    bindAll(env.DB, [
      ...buildDeleteStatements("products", productDiff.deletes),
      ...buildDeleteStatements("collections", collectionDiff.deletes),
      ...buildUpsertStatements(
        "collections",
        COLLECTION_COLUMNS,
        collectionDiff.upserts,
      ),
      ...buildUpsertStatements(
        "products",
        PRODUCT_COLUMNS,
        productDiff.upserts,
      ),
      {
        sql: "DELETE FROM catalog_meta WHERE key IN ('last_error', 'last_error_at')",
        params: [],
      },
      ...meta,
    ]),
  );

  return {
    products: products.length,
    collections: collections.length,
    upserted,
    deleted,
  };
}

async function acquireLease(env: Env, now: number): Promise<boolean> {
  const result = await env.DB.prepare(
    `INSERT INTO catalog_meta (key, value) VALUES ('sync_lease', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value
     WHERE CAST(catalog_meta.value AS INTEGER) < ?`,
  )
    .bind(String(now + SYNC_LEASE_MS), now)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

export type SyncOutcome =
  | { ok: true; status: "synced"; passes: SyncPassResult[] }
  | { ok: true; status: "queued" }
  | { ok: false; error: string };

/**
 * One sync at a time. A request that arrives mid-sync marks `sync_pending`
 * and returns; the lease holder re-runs so the final state is never older
 * than the newest request.
 */
export async function runSync(
  env: Env,
  options: { allowEmpty?: boolean } = {},
): Promise<SyncOutcome> {
  await ensureSchema(env);

  if (!(await acquireLease(env, Date.now()))) {
    await env.DB.prepare(
      "INSERT OR REPLACE INTO catalog_meta (key, value) VALUES ('sync_pending', '1')",
    ).run();
    return { ok: true, status: "queued" };
  }

  const passes: SyncPassResult[] = [];
  try {
    for (let pass = 0; pass < MAX_SYNC_PASSES; pass += 1) {
      await env.DB.prepare(
        "DELETE FROM catalog_meta WHERE key = 'sync_pending'",
      ).run();
      passes.push(
        await runSyncPass(env, { allowEmpty: Boolean(options.allowEmpty) }),
      );
      const pending = await env.DB.prepare(
        "SELECT value FROM catalog_meta WHERE key = 'sync_pending'",
      ).first<{ value: string }>();
      if (!pending) break;
    }
    return { ok: true, status: "synced", passes };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await env.DB.batch(
      bindAll(env.DB, [
        {
          sql: "INSERT OR REPLACE INTO catalog_meta (key, value) VALUES ('last_error', ?)",
          params: [message.slice(0, 500)],
        },
        {
          sql: "INSERT OR REPLACE INTO catalog_meta (key, value) VALUES ('last_error_at', ?)",
          params: [new Date().toISOString()],
        },
      ]),
    ).catch(() => undefined);
    return { ok: false, error: message };
  } finally {
    await env.DB.prepare(
      "UPDATE catalog_meta SET value = '0' WHERE key = 'sync_lease'",
    )
      .run()
      .catch(() => undefined);
  }
}

class NotSyncedError extends Error {}

async function requireCheckedAt(env: Env): Promise<string> {
  const row = await env.DB.prepare(
    "SELECT value FROM catalog_meta WHERE key = 'checked_at'",
  )
    .first<{ value: string }>()
    .catch(() => null);
  if (!row?.value) throw new NotSyncedError("catalog not synced yet");
  return row.value;
}

function parsePaging(url: URL) {
  const first = Number(url.searchParams.get("first") ?? "24");
  const offset = Number(url.searchParams.get("offset") ?? "0");
  if (
    !Number.isInteger(first) ||
    first < 1 ||
    first > MAX_PAGE_SIZE ||
    !Number.isInteger(offset) ||
    offset < 0
  ) {
    throw new UnsupportedQueryError("invalid pagination");
  }
  return { first, offset };
}

async function handleSearch(env: Env, url: URL) {
  const request = parseProductSearchRequest(url.searchParams);
  const checkedAt = await requireCheckedAt(env);

  let matchingCollections: {
    id: string;
    label: string;
    slug: string;
    featuredImage: { key: string; alt: string | null };
  }[] = [];
  if (request.term) {
    const matchQuery = buildCollectionMatchQuery(request.term);
    const { results: matches } = await env.DB.prepare(matchQuery.sql)
      .bind(...matchQuery.params)
      .all<CollectionCardQueryRow>();
    matchingCollections = matches.map((row) => ({
      id: row.id,
      label: row.label,
      slug: row.slug,
      featuredImage: { key: row.image_key ?? "", alt: row.image_alt },
    }));
  }

  const query = buildProductSearchQuery(
    request,
    matchingCollections.map((c) => c.id),
  );
  if (!query) {
    return {
      checkedAt,
      productsCollection: {
        edges: [],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
      matchingCollections,
    };
  }

  const { results } = await env.DB.prepare(query.sql)
    .bind(...query.params)
    .all<ProductCardQueryRow>();
  const page = toPage(results, request.first, request.offset);
  return {
    checkedAt,
    productsCollection: {
      edges: page.items.map((row) => ({ node: toProductCardNode(row) })),
      pageInfo: page.pageInfo,
    },
    matchingCollections,
  };
}

async function handleFeatured(env: Env, url: URL) {
  const { first, offset } = parsePaging(url);
  const checkedAt = await requireCheckedAt(env);
  const query = buildFeaturedQuery(first, offset);
  const { results } = await env.DB.prepare(query.sql)
    .bind(...query.params)
    .all<ProductCardQueryRow>();
  const page = toPage(results, first, offset);
  return {
    checkedAt,
    productsCollection: {
      edges: page.items.map((row) => ({ node: toProductCardNode(row) })),
      pageInfo: page.pageInfo,
    },
  };
}

async function handleCollections(env: Env) {
  const checkedAt = await requireCheckedAt(env);
  const query = buildCollectionsListQuery();
  const { results } = await env.DB.prepare(query.sql)
    .bind(...query.params)
    .all<CollectionCardQueryRow>();
  return {
    checkedAt,
    collectionsCollection: {
      edges: results.map((row) => ({ node: toCollectionCardNode(row) })),
    },
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      if (path === "/health" && request.method === "GET") {
        const meta = await readMeta(env).catch(() => ({}));
        const {
          sync_lease: _lease,
          sync_pending: _pending,
          ...publicMeta
        } = meta as Record<string, string>;
        return json({ ok: true, meta: publicMeta });
      }

      if (!isAuthorized(request, env)) {
        return json({ error: "unauthorized" }, 401);
      }

      if (path === "/sync" && request.method === "POST") {
        const outcome = await runSync(env, {
          allowEmpty: url.searchParams.get("allowEmpty") === "1",
        });
        return json(outcome, outcome.ok ? 200 : 502);
      }

      if (request.method !== "GET") {
        return json({ error: "method_not_allowed" }, 405);
      }
      if (path === "/collections") return json(await handleCollections(env));
      if (path === "/products/featured") {
        return json(await handleFeatured(env, url));
      }
      if (path === "/products/search") {
        return json(await handleSearch(env, url));
      }
      return json({ error: "not_found" }, 404);
    } catch (error) {
      if (error instanceof UnsupportedQueryError) {
        return json({ error: "unsupported_query", detail: error.message }, 422);
      }
      if (error instanceof NotSyncedError) {
        return json({ error: "not_synced" }, 503);
      }
      const message = error instanceof Error ? error.message : String(error);
      return json({ error: "internal", detail: message.slice(0, 300) }, 500);
    }
  },

  async scheduled(
    _event: unknown,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      runSync(env).then((outcome) => {
        if (!outcome.ok)
          console.error("[hub-catalog] cron sync failed:", outcome.error);
      }),
    );
  },
};
