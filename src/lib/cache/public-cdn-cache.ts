import { NextResponse } from "next/server";
import {
  CLOUDFLARE_API_CACHE_SECONDS,
  EDGE_CACHE_TAGS,
  STOREFRONT_API_CDN_SECONDS,
} from "./constants";

type PublicCdnOptions = {
  revalidateSeconds?: number;
  /** Purge handles for writes (see EDGE_CACHE_TAGS); `all` is always added. */
  cacheTags?: readonly string[];
};

/**
 * Headers for public JSON/listing APIs cached at the Cloudflare and Vercel edges.
 * Strips Next.js RSC `Vary` values that otherwise force cf-cache-status: DYNAMIC.
 * Only for responses identical for every visitor (no cookies, no session).
 */
export function applyPublicCdnCacheHeaders(
  response: NextResponse,
  {
    revalidateSeconds = STOREFRONT_API_CDN_SECONDS,
    cacheTags = [],
  }: PublicCdnOptions = {},
): NextResponse {
  const staleWhileRevalidate = Math.max(revalidateSeconds, 60);
  const tags = [...new Set([EDGE_CACHE_TAGS.all, ...cacheTags])].join(",");

  response.headers.set(
    "Cache-Control",
    `public, max-age=0, s-maxage=${revalidateSeconds}, stale-while-revalidate=${staleWhileRevalidate}`,
  );
  response.headers.set(
    "CDN-Cache-Control",
    `public, max-age=${revalidateSeconds}`,
  );
  response.headers.set(
    "Cloudflare-CDN-Cache-Control",
    `public, max-age=${Math.max(revalidateSeconds, CLOUDFLARE_API_CACHE_SECONDS)}`,
  );
  response.headers.set("Vercel-Cache-Tag", tags);
  response.headers.set("Cache-Tag", tags);
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
