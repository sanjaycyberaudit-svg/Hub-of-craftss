import { STOREFRONT_REVALIDATE_SECONDS } from "./constants";
import { redisGet, redisSet } from "./redis";

type CacheOptions = {
  revalidate?: number;
  tags?: string[];
};

type MemoryEntry = { value: unknown; expiresAt: number };

const MAX_MEMORY_ENTRIES = 256;
const memoryCache = new Map<string, MemoryEntry>();

function isCloudflareWorkerRuntime() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.userAgent === "string" &&
    navigator.userAgent.includes("Cloudflare-Workers")
  );
}

function memoryGet<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function memorySet<T>(key: string, value: T, ttlSeconds: number): void {
  if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + Math.max(30, ttlSeconds) * 1000,
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

/**
 * Read-through cache: optional Upstash Redis (cross-instance) + Next.js Data Cache.
 * On Cloudflare Workers, skip `unstable_cache` — it can hang without a cache binding
 * and Cloudflare then returns Error 1101. Use a short-lived in-isolate memory cache
 * when Redis is not configured.
 */
export async function withStorefrontCache<T>(
  key: string,
  loader: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  const revalidate = options.revalidate ?? STOREFRONT_REVALIDATE_SECONDS;

  const redisHit = await redisGet<T>(key);
  if (redisHit !== null) {
    memorySet(key, redisHit, revalidate);
    return redisHit;
  }

  if (isCloudflareWorkerRuntime()) {
    const memoryHit = memoryGet<T>(key);
    if (memoryHit !== null) {
      return memoryHit;
    }

    const value = await loader();
    memorySet(key, value, revalidate);
    void redisSet(key, value, revalidate);
    return value;
  }

  const { unstable_cache } = await import("next/cache");
  const tags = options.tags ?? [];
  const cachedLoader = unstable_cache(loader, [key], { revalidate, tags });
  const value = await cachedLoader();

  memorySet(key, value, revalidate);
  void redisSet(key, value, revalidate);
  return value;
}
