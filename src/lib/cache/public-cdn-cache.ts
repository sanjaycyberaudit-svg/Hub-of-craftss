import { NextResponse } from "next/server";
import { EDGE_CACHE_TAGS, STOREFRONT_API_CDN_SECONDS } from "./constants";

type PublicCdnOptions = {
  revalidateSeconds?: number;
  /** Purge handles for writes (see EDGE_CACHE_TAGS); `all` is always added. */
  cacheTags?: readonly string[];
};

/**
 * Headers for public JSON/listing APIs that may be cached at Cloudflare edge.
 * Strips Next.js RSC `Vary` values that otherwise force cf-cache-status: DYNAMIC.
 */
export function applyPublicCdnCacheHeaders(
  response: NextResponse,
  {
    revalidateSeconds = STOREFRONT_API_CDN_SECONDS,
    cacheTags = [],
  }: PublicCdnOptions = {},
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
  response.headers.set(
    "Vercel-Cache-Tag",
    [...new Set([EDGE_CACHE_TAGS.all, ...cacheTags])].join(","),
  );
  response.headers.delete("vary");

  return response;
}

export function publicCdnJson<T>(
  data: T,
  options: PublicCdnOptions & { init?: ResponseInit } = {},
): NextResponse {
  return applyPublicCdnCacheHeaders(
    NextResponse.json(data, options.init),
    options,
  );
}
