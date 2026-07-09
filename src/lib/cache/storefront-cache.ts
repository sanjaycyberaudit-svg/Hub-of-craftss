import { unstable_cache } from "next/cache";
import { STOREFRONT_REVALIDATE_SECONDS } from "./constants";
import { redisGet, redisSet } from "./redis";

type CacheOptions = {
  revalidate?: number;
  tags?: string[];
};

/**
 * Read-through cache: optional Upstash Redis (cross-instance) + Next.js Data Cache.
 */
export async function withStorefrontCache<T>(
  key: string,
  loader: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  const revalidate = options.revalidate ?? STOREFRONT_REVALIDATE_SECONDS;
  const tags = options.tags ?? [];

  const redisHit = await redisGet<T>(key);
  if (redisHit !== null) {
    return redisHit;
  }

  const cachedLoader = unstable_cache(loader, [key], { revalidate, tags });
  const value = await cachedLoader();

  void redisSet(key, value, revalidate);
  return value;
}
