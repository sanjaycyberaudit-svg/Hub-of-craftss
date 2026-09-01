import { NextResponse } from "next/server";
import { STOREFRONT_REVALIDATE_SECONDS } from "./constants";

/**
 * Headers for public JSON/listing APIs that may be cached at Cloudflare edge.
 * Strips Next.js RSC `Vary` values that otherwise force cf-cache-status: DYNAMIC.
 */
export function applyPublicCdnCacheHeaders(
  response: NextResponse,
  revalidateSeconds = STOREFRONT_REVALIDATE_SECONDS,
): NextResponse {
  const staleWhileRevalidate = Math.max(revalidateSeconds, 60);

  response.headers.set(
    "Cache-Control",
    `public, max-age=0, s-maxage=${revalidateSeconds}, stale-while-revalidate=${staleWhileRevalidate}`,
  );
  response.headers.set(
    "CDN-Cache-Control",
    `public, max-age=${revalidateSeconds}`,
  );
  response.headers.delete("vary");

  return response;
}

export function publicCdnJson<T>(
  data: T,
  init?: ResponseInit,
  revalidateSeconds = STOREFRONT_REVALIDATE_SECONDS,
): NextResponse {
  return applyPublicCdnCacheHeaders(
    NextResponse.json(data, init),
    revalidateSeconds,
  );
}
