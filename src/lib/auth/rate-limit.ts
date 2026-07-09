const AUTH_RATE_LIMIT_PATHS = [
  "/sign-in",
  "/sign-up",
  "/auth/callback",
  "/forgot-password",
  "/reset-password",
] as const;

const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_SEC = 60;

export function isAuthRateLimitPath(pathname: string): boolean {
  return AUTH_RATE_LIMIT_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function getClientIp(forwardedFor: string | null): string {
  if (!forwardedFor) return "unknown";
  return forwardedFor.split(",")[0]?.trim() || "unknown";
}

export function getRequestIp(headers: Headers): string {
  return getClientIp(
    headers.get("x-forwarded-for") ?? headers.get("x-real-ip"),
  );
}

type RateLimitResult = {
  limited: boolean;
  remaining: number;
};

/** Edge-safe Upstash counter (fetch REST API, no Node Redis client). */
async function upstashIncrement(
  key: string,
  windowSec: number,
): Promise<number | null> {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!baseUrl || !token) return null;

  const headers = { Authorization: `Bearer ${token}` };
  const encodedKey = encodeURIComponent(key);

  try {
    const incrResponse = await fetch(`${baseUrl}/incr/${encodedKey}`, {
      headers,
      cache: "no-store",
    });

    if (!incrResponse.ok) return null;

    const count = (await incrResponse.json()) as number;

    if (count === 1) {
      await fetch(`${baseUrl}/expire/${encodedKey}/${windowSec}`, {
        headers,
        cache: "no-store",
      });
    }

    return count;
  } catch (error) {
    console.warn("[auth] Upstash rate limit failed:", error);
    return null;
  }
}

export async function checkAuthRateLimit(
  ip: string,
  options?: { limit?: number; windowSec?: number },
): Promise<RateLimitResult> {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const windowSec = options?.windowSec ?? DEFAULT_WINDOW_SEC;
  const key = `auth:rl:${ip}`;

  return checkRateLimit(key, { limit, windowSec });
}

const CHECKOUT_DEFAULT_LIMIT = 10;
const CHECKOUT_DEFAULT_WINDOW_SEC = 60;

export async function checkCheckoutRateLimit(
  ip: string,
  options?: { limit?: number; windowSec?: number },
): Promise<RateLimitResult> {
  const limit = options?.limit ?? CHECKOUT_DEFAULT_LIMIT;
  const windowSec = options?.windowSec ?? CHECKOUT_DEFAULT_WINDOW_SEC;
  const key = `checkout:rl:${ip}`;

  return checkRateLimit(key, { limit, windowSec });
}

async function checkRateLimit(
  key: string,
  options: { limit: number; windowSec: number },
): Promise<RateLimitResult> {
  const count = await upstashIncrement(key, options.windowSec);
  if (count !== null) {
    return {
      limited: count > options.limit,
      remaining: Math.max(0, options.limit - count),
    };
  }

  return { limited: false, remaining: options.limit };
}
