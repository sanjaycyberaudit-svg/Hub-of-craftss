import { isControlFlowError, withRetry } from "@/lib/resilience";
import { STOREFRONT_REVALIDATE_SECONDS } from "./constants";
import { isRedisCacheEnabled, redisGet, redisSet } from "./redis";

type CacheOptions = {
  revalidate?: number;
  tags?: string[];
  /** Set false when the caller has its own fallback and must fail fast. */
  retry?: boolean;
};

/**
 * Cached payloads carry their own freshness deadline so the entry can outlive
 * it. Once `freshUntil` passes we reload, but the stale copy stays available as
 * a fallback if the origin is failing (HTTP `stale-if-error` semantics).
 */
type CacheEnvelope<T> = {
  __swr: 1;
  value: T;
  freshUntil: number;
};

type MemoryEntry = {
  envelope: CacheEnvelope<unknown>;
  expiresAt: number;
  storedAt: number;
};

/**
 * Suffix (not prefix) so `redisDelByPrefix("sf:…")` invalidation keeps working.
 * Bump it whenever the stored shape changes, so instances running the previous
 * deployment never read a payload they cannot interpret.
 */
const REDIS_KEY_SUFFIX = "|v2";

const MAX_MEMORY_ENTRIES = 256;
/**
 * Admin invalidation clears Redis but only the memory of the instance that ran
 * it, so other instances must re-check Redis at least this often.
 */
const MEMORY_TRUST_MS = 15_000;
/** How long a stale copy stays usable after it expires. */
const STALE_MULTIPLIER = 20;
const MIN_STALE_SECONDS = 900;
const MAX_STALE_SECONDS = 86_400;
const memoryCache = new Map<string, MemoryEntry>();

function isCloudflareWorkerRuntime() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.userAgent === "string" &&
    navigator.userAgent.includes("Cloudflare-Workers")
  );
}

function staleTtlSeconds(revalidate: number) {
  return Math.min(
    MAX_STALE_SECONDS,
    Math.max(MIN_STALE_SECONDS, revalidate * STALE_MULTIPLIER),
  );
}

function isEnvelope<T>(value: unknown): value is CacheEnvelope<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as CacheEnvelope<T>).__swr === 1 &&
    typeof (value as CacheEnvelope<T>).freshUntil === "number"
  );
}

function memoryGet(key: string): MemoryEntry | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry;
}

function memorySet<T>(
  key: string,
  envelope: CacheEnvelope<T>,
  ttlSeconds: number,
): void {
  if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }

  memoryCache.set(key, {
    envelope: envelope as CacheEnvelope<unknown>,
    expiresAt: Date.now() + Math.max(30, ttlSeconds) * 1000,
    storedAt: Date.now(),
  });
}

export function clearStorefrontMemoryCache(prefix?: string): void {
  if (!prefix) {
    memoryCache.clear();
    return;
  }

  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}

/** Reads the newest envelope available, preferring shared Redis over the isolate. */
async function readEnvelope<T>(
  key: string,
  revalidate: number,
): Promise<{ envelope: CacheEnvelope<T>; fromMemory: boolean } | null> {
  const entry = memoryGet(key);
  const local = entry ? (entry.envelope as CacheEnvelope<T>) : null;
  const now = Date.now();
  const redisEnabled = isRedisCacheEnabled();
  const localTrusted =
    !!entry && (!redisEnabled || now - entry.storedAt < MEMORY_TRUST_MS);

  if (local && local.freshUntil > now && localTrusted) {
    return { envelope: local, fromMemory: true };
  }

  const remote = await redisGet<unknown>(key + REDIS_KEY_SUFFIX);

  if (remote === null || remote === undefined) {
    if (!local) return null;
    // Redis no longer has it (invalidated): reload, keeping the copy as a fallback.
    return {
      envelope: localTrusted ? local : { ...local, freshUntil: 0 },
      fromMemory: true,
    };
  }

  if (isEnvelope<T>(remote)) {
    if (local && localTrusted && local.freshUntil > remote.freshUntil) {
      return { envelope: local, fromMemory: true };
    }
    return { envelope: remote, fromMemory: false };
  }

  // Unexpected shape (hand-written key, partial rollout): treat as one fresh cycle.
  return {
    envelope: {
      __swr: 1,
      value: remote as T,
      freshUntil: now + revalidate * 1000,
    },
    fromMemory: false,
  };
}

/**
 * Read-through cache: optional Upstash Redis (cross-instance) + Next.js Data Cache.
 * On Cloudflare Workers, skip `unstable_cache` — it can hang without a cache binding
 * and Cloudflare then returns Error 1101. Use a short-lived in-isolate memory cache
 * when Redis is not configured.
 *
 * Loaders are retried on transient transport faults. If they still fail, the last
 * known-good value is served rather than throwing a render-killing error.
 */
export async function withStorefrontCache<T>(
  key: string,
  loader: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  const revalidate = options.revalidate ?? STOREFRONT_REVALIDATE_SECONDS;
  const staleTtl = staleTtlSeconds(revalidate);

  const read = await readEnvelope<T>(key, revalidate);
  const cached = read?.envelope ?? null;
  if (read && cached && cached.freshUntil > Date.now()) {
    if (!read.fromMemory) memorySet(key, cached, staleTtl);
    return cached.value;
  }

  const load =
    options.retry === false
      ? loader
      : () => withRetry(loader, { label: `cache:${key}` });

  try {
    let value: T;

    if (isCloudflareWorkerRuntime()) {
      value = await load();
    } else {
      const { unstable_cache } = await import("next/cache");
      const tags = options.tags ?? [];
      value = await unstable_cache(load, [key], { revalidate, tags })();
    }

    const envelope: CacheEnvelope<T> = {
      __swr: 1,
      value,
      freshUntil: Date.now() + revalidate * 1000,
    };
    memorySet(key, envelope, staleTtl);
    void redisSet(key + REDIS_KEY_SUFFIX, envelope, staleTtl);
    return value;
  } catch (error) {
    if (isControlFlowError(error)) throw error;

    if (cached) {
      console.error(
        `[cache] loader failed for "${key}"; serving stale value:`,
        error instanceof Error ? error.message : error,
      );
      return cached.value;
    }

    throw error;
  }
}
