import { STOREFRONT_REVALIDATE_SECONDS } from "./constants";
import { redisGet, redisSet } from "./redis";

type CacheOptions = {
  revalidate?: number;
  tags?: string[];
};

function isCloudflareWorkerRuntime() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.userAgent === "string" &&
    navigator.userAgent.includes("Cloudflare-Workers")
  );
}

/**
 * Read-through cache: optional Upstash Redis (cross-instance) + Next.js Data Cache.
 * On Cloudflare Workers, skip `unstable_cache` — it can hang without a cache binding
 * and Cloudflare then returns Error 1101.
 */
export async function withStorefrontCache<T>(
  key: string,
  loader: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  const revalidate = options.revalidate ?? STOREFRONT_REVALIDATE_SECONDS;

  const redisHit = await redisGet<T>(key);
  if (redisHit !== null) {
    return redisHit;
  }

  if (isCloudflareWorkerRuntime()) {
    const value = await loader();
    void redisSet(key, value, revalidate);
    return value;
  }

  const { unstable_cache } = await import("next/cache");
  const tags = options.tags ?? [];
  const cachedLoader = unstable_cache(loader, [key], { revalidate, tags });
  const value = await cachedLoader();

  void redisSet(key, value, revalidate);
  return value;
}
