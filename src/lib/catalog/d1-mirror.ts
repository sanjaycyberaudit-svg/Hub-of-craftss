import "server-only";

import { after } from "next/server";
import type {
  AllCollectionsQueryQuery,
  FeaturedProductsQueryQuery,
  SearchQuery,
  SearchQueryVariables,
} from "@/gql/graphql";
import { redisDelByPrefix } from "@/lib/cache/redis";
import { clearStorefrontMemoryCache } from "@/lib/cache/storefront-cache";
import type { StorefrontProductSearchVariables } from "@/lib/storefront/search-params";
import {
  normalizeStorefrontSearchTerm,
  type StorefrontCollectionMatch,
} from "@/lib/storefront/search-utils";

/**
 * Client for the hub-catalog Worker (D1 read mirror of the storefront catalog).
 * Reads are opt-in via CATALOG_READ=d1 and every caller keeps Supabase as the
 * fallback. Cart, checkout and product pages always read live Supabase.
 */

export type CatalogReadSource = "supabase" | "d1";

export type CatalogSort =
  | "best_match"
  | "price_asc"
  | "price_desc"
  | "newest"
  | "name_asc";

/** Short so a post-sync miss never serves mirror data older than a minute. */
export const CATALOG_CACHE_SECONDS = 60;
export const CATALOG_CACHE_PREFIXES = [
  "sf:products:d1:",
  "sf:collection:d1:",
] as const;

const READ_TIMEOUT_MS = 2_500;
const SYNC_TIMEOUT_MS = 25_000;
const DEFAULT_MAX_STALENESS_MINUTES = 180;

export class CatalogMirrorUnavailableError extends Error {
  constructor(reason: string) {
    super(`catalog mirror unavailable: ${reason}`);
    this.name = "CatalogMirrorUnavailableError";
  }
}

export function getCatalogReadSource(): CatalogReadSource {
  const raw = (process.env.CATALOG_READ ?? "supabase").trim().toLowerCase();
  return raw === "d1" ? "d1" : "supabase";
}

export function isCatalogD1Enabled(): boolean {
  return getCatalogReadSource() === "d1" && getCatalogWorkerConfig() !== null;
}

function getCatalogWorkerConfig(): { baseUrl: string; secret: string } | null {
  const baseUrl = (process.env.CATALOG_WORKER_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
  const secret = (process.env.CATALOG_SYNC_SECRET ?? "").trim();
  if (!baseUrl || !secret) return null;
  if (
    !/^https:\/\//.test(baseUrl) &&
    !/^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(`${baseUrl}/`)
  ) {
    return null;
  }
  return { baseUrl, secret };
}

function maxStalenessMs(): number {
  const minutes = Number(process.env.CATALOG_MAX_STALENESS_MINUTES);
  return (
    (Number.isFinite(minutes) && minutes > 0
      ? minutes
      : DEFAULT_MAX_STALENESS_MINUTES) * 60_000
  );
}

/**
 * Digits-only cursors are offsets (D1 and the SQL price engine share them);
 * pg_graphql cursors are opaque base64 and only Supabase can resume them.
 */
export function isOffsetCursor(after: string | null | undefined): boolean {
  return typeof after === "string" && /^\d+$/.test(after);
}

export function canServeFromCatalogMirror(
  after: string | null | undefined,
): boolean {
  return !after || isOffsetCursor(after);
}

/** Same precedence as searchVariablesToQueryString(). */
export function mapOrderByToCatalogSort(
  orderBy: SearchQueryVariables["orderBy"],
): CatalogSort | null {
  if (!orderBy) return null;
  const rules = Array.isArray(orderBy) ? orderBy : [orderBy];
  if (
    rules.some((o) => "featured" in o) &&
    rules.some((o) => "created_at" in o)
  ) {
    return "best_match";
  }
  if (rules.some((o) => "price" in o && o.price?.includes("Asc")))
    return "price_asc";
  if (rules.some((o) => "price" in o && o.price?.includes("Desc")))
    return "price_desc";
  if (rules.some((o) => "created_at" in o)) return "newest";
  if (rules.some((o) => "name" in o)) return "name_asc";
  return null;
}

async function catalogRequest<T>(
  path: string,
  init: { method?: "GET" | "POST"; timeoutMs?: number } = {},
): Promise<T> {
  const config = getCatalogWorkerConfig();
  if (!config) throw new CatalogMirrorUnavailableError("not configured");

  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${config.secret}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(init.timeoutMs ?? READ_TIMEOUT_MS),
    });
  } catch (error) {
    throw new CatalogMirrorUnavailableError(
      error instanceof Error ? error.message : String(error),
    );
  }

  const body = (await res.json().catch(() => null)) as T | null;
  if (!res.ok || body === null) {
    const detail =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : "invalid response";
    throw new CatalogMirrorUnavailableError(`status ${res.status} ${detail}`);
  }
  return body;
}

function assertFresh(checkedAt: unknown): void {
  const checkedAtMs =
    typeof checkedAt === "string" ? Date.parse(checkedAt) : NaN;
  if (!Number.isFinite(checkedAtMs)) {
    throw new CatalogMirrorUnavailableError("missing sync timestamp");
  }
  if (Date.now() - checkedAtMs > maxStalenessMs()) {
    throw new CatalogMirrorUnavailableError(`stale since ${checkedAt}`);
  }
}

function assertProductsCollection(value: unknown): void {
  const collection = value as { edges?: unknown; pageInfo?: unknown } | null;
  if (!collection || !Array.isArray(collection.edges) || !collection.pageInfo) {
    throw new CatalogMirrorUnavailableError("malformed products payload");
  }
}

export type CatalogProductSearchResult = {
  productsCollection: SearchQuery["productsCollection"];
  matchingCollections: StorefrontCollectionMatch[];
};

export async function fetchCatalogProductSearch(
  variables: StorefrontProductSearchVariables,
): Promise<CatalogProductSearchResult> {
  const qs = new URLSearchParams();
  const term = normalizeStorefrontSearchTerm(variables.search);
  if (term) qs.set("q", term);
  if (variables.collections?.length) {
    qs.set("collections", variables.collections.join(","));
  }
  if (variables.lower && variables.upper) {
    qs.set("price_min", String(variables.lower));
    qs.set("price_max", String(variables.upper));
  }
  const sort = mapOrderByToCatalogSort(variables.orderBy);
  if (sort) qs.set("sort", sort);
  qs.set("first", String(variables.first));
  qs.set(
    "offset",
    isOffsetCursor(variables.after) ? String(variables.after) : "0",
  );

  const body = await catalogRequest<{
    checkedAt?: string;
    productsCollection?: unknown;
    matchingCollections?: unknown;
  }>(`/products/search?${qs.toString()}`);
  assertFresh(body.checkedAt);
  assertProductsCollection(body.productsCollection);

  return {
    productsCollection:
      body.productsCollection as SearchQuery["productsCollection"],
    matchingCollections: Array.isArray(body.matchingCollections)
      ? (body.matchingCollections as StorefrontCollectionMatch[])
      : [],
  };
}

export async function fetchCatalogFeaturedProducts(variables: {
  first: number;
  after?: string | null;
}): Promise<FeaturedProductsQueryQuery["productsCollection"]> {
  const qs = new URLSearchParams({
    first: String(variables.first),
    offset: isOffsetCursor(variables.after) ? String(variables.after) : "0",
  });
  const body = await catalogRequest<{
    checkedAt?: string;
    productsCollection?: unknown;
  }>(`/products/featured?${qs.toString()}`);
  assertFresh(body.checkedAt);
  assertProductsCollection(body.productsCollection);
  return body.productsCollection as FeaturedProductsQueryQuery["productsCollection"];
}

export async function fetchCatalogCollections(): Promise<
  AllCollectionsQueryQuery["collectionsCollection"]
> {
  const body = await catalogRequest<{
    checkedAt?: string;
    collectionsCollection?: { edges?: unknown };
  }>("/collections");
  assertFresh(body.checkedAt);
  if (!Array.isArray(body.collectionsCollection?.edges)) {
    throw new CatalogMirrorUnavailableError("malformed collections payload");
  }
  return body.collectionsCollection as AllCollectionsQueryQuery["collectionsCollection"];
}

export type CatalogSyncResult =
  | { ok: true; skipped: true }
  | { ok: true; skipped: false; changed: boolean }
  | { ok: false; error: string };

/** Never throws: catalog writes must not fail because the mirror is down. */
export async function syncCatalogMirror(): Promise<CatalogSyncResult> {
  if (!getCatalogWorkerConfig()) return { ok: true, skipped: true };
  try {
    const body = await catalogRequest<{
      ok?: boolean;
      status?: string;
      passes?: { upserted?: number; deleted?: number }[];
      error?: string;
    }>("/sync", { method: "POST", timeoutMs: SYNC_TIMEOUT_MS });
    if (body.ok === false) {
      return { ok: false, error: body.error ?? "sync failed" };
    }
    const changed = (body.passes ?? []).some(
      (pass) => (pass.upserted ?? 0) + (pass.deleted ?? 0) > 0,
    );
    return { ok: true, skipped: false, changed };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function clearCatalogMirrorCaches(): Promise<void> {
  await Promise.all(
    CATALOG_CACHE_PREFIXES.map((prefix) =>
      redisDelByPrefix(prefix).catch((error) => {
        console.warn("[catalog-d1] redis clear failed:", error);
      }),
    ),
  );
  CATALOG_CACHE_PREFIXES.forEach((prefix) =>
    clearStorefrontMemoryCache(prefix),
  );
}

async function runCatalogMirrorSync(): Promise<void> {
  const result = await syncCatalogMirror();
  if (result.ok === false) {
    console.warn("[catalog-d1] sync failed:", result.error);
    return;
  }
  // Mirror reads cached between the storefront bust and the sync finishing are stale.
  if (result.skipped === false && result.changed) {
    await clearCatalogMirrorCaches();
  }
}

/**
 * Runs the mirror sync after the response is sent (kept alive by `after`),
 * so admin saves never wait on it. Mirrors warm even while CATALOG_READ=supabase.
 */
export function scheduleCatalogMirrorSync(): void {
  if (!getCatalogWorkerConfig()) return;
  try {
    after(runCatalogMirrorSync);
  } catch {
    // Outside a request scope (scripts, tests): run detached.
    void runCatalogMirrorSync().catch((error) => {
      console.warn("[catalog-d1] sync crashed:", error);
    });
  }
}
