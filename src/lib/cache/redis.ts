import { Redis } from "@upstash/redis";

let client: Redis | null | undefined;

function getRedis(): Redis | null {
  if (client !== undefined) return client;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    client = null;
    return client;
  }

  client = new Redis({ url, token });
  return client;
}

export function isRedisCacheEnabled() {
  return getRedis() !== null;
}

export async function redisGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    return (await redis.get<T>(key)) ?? null;
  } catch (error) {
    console.warn("[cache] Redis GET failed:", error);
    return null;
  }
}

export async function redisSet<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.set(key, value, { ex: Math.max(30, ttlSeconds) });
  } catch (error) {
    console.warn("[cache] Redis SET failed:", error);
  }
}

export async function redisDelByPrefix(prefix: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.warn("[cache] Redis DEL failed:", error);
  }
}
