import type { Metadata } from "next";
import { SEO_BRAND_ASSETS } from "@/lib/seo/brand-assets";
import { getURL, keytoUrl } from "@/lib/utils";

/** Site-wide JPG for Meta/Twitter link previews (not SVG, not *.r2.dev). */
export const SOCIAL_IMAGE_FALLBACK_PATH = SEO_BRAND_ASSETS.ogShare;

const SOCIAL_IMAGE_WIDTH = 1200;
const SOCIAL_IMAGE_HEIGHT = 630;
/** Proven-safe social resize when a first-party /cdn proxy exists. */
const SOCIAL_CDN_WIDTH = 400;
const SOCIAL_CDN_QUALITY = 75;
const SOCIAL_CDN_FORMAT = "webp";

export type SocialImageResolveDeps = {
  siteOrigin: string;
  resolveMediaUrl: (key: string) => string;
  /** Override CDN social URL builder (tests / future media CDN). */
  buildCdnSocialUrl?: (key: string) => string | null;
};

function normalizeSiteOrigin(siteUrl: string): string {
  return siteUrl.replace(/\/$/, "");
}

function mediaCdnOrigin(): string | null {
  const fromEnv = String(process.env.NEXT_PUBLIC_MEDIA_CDN_ORIGIN ?? "")
    .trim()
    .replace(/\/$/, "");
  return fromEnv || null;
}

/**
 * Extract an uploads/* object key from a raw key or absolute R2/CDN URL.
 */
export function extractUploadsObjectKey(keyOrUrl: string): string | null {
  const raw = keyOrUrl.trim();
  if (!raw || raw.startsWith("/")) return null;

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      const cdnOrigin = mediaCdnOrigin();
      if (cdnOrigin && url.origin === new URL(cdnOrigin).origin) {
        const m = url.pathname.match(/^\/cdn\/[^/]+\/(.+)$/);
        return m?.[1] ? decodeURIComponent(m[1]) : null;
      }
      if (url.hostname.endsWith(".r2.dev")) {
        const key = decodeURIComponent(url.pathname.replace(/^\//, ""));
        return key.startsWith("uploads/") ? key : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  if (raw.includes("..")) return null;
  const key = raw.replace(/^\//, "");
  return key.startsWith("uploads/") ? key : null;
}

function isRejectedSocialImageUrl(url: string): boolean {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  if (!path) return true;
  if (path.includes("/_next/image")) return true;
  if (path.endsWith(".svg")) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith(".r2.dev")) return true;
  } catch {
    // Relative paths checked on path only above.
  }
  return false;
}

function defaultBuildCdnSocialUrl(key: string): string | null {
  const origin = mediaCdnOrigin();
  if (!origin) return null;
  const opts = `w=${SOCIAL_CDN_WIDTH},q=${SOCIAL_CDN_QUALITY},f=${SOCIAL_CDN_FORMAT}`;
  return `${origin}/cdn/${opts}/${key}`;
}

export function absoluteSocialFallbackUrl(
  siteOrigin = normalizeSiteOrigin(getURL()),
): string {
  return `${normalizeSiteOrigin(siteOrigin)}${SOCIAL_IMAGE_FALLBACK_PATH}`;
}

/**
 * Resolve a media key/URL into an absolute HTTPS image suitable for og:image.
 * Prefers first-party media CDN when configured; never emits *.r2.dev.
 */
export function resolveSocialImageUrl(
  keyOrUrl?: string | null,
  deps?: SocialImageResolveDeps,
): string {
  const siteOrigin = normalizeSiteOrigin(deps?.siteOrigin ?? getURL());
  const resolveMediaUrl = deps?.resolveMediaUrl ?? keytoUrl;
  const buildCdnSocialUrl = deps?.buildCdnSocialUrl ?? defaultBuildCdnSocialUrl;
  const fallback = absoluteSocialFallbackUrl(siteOrigin);

  if (!keyOrUrl?.trim()) return fallback;

  const input = keyOrUrl.trim();

  const mediaKey = extractUploadsObjectKey(input);
  if (mediaKey) {
    const cdnUrl = buildCdnSocialUrl(mediaKey);
    if (
      cdnUrl &&
      (cdnUrl.startsWith("http://") || cdnUrl.startsWith("https://")) &&
      !isRejectedSocialImageUrl(cdnUrl)
    ) {
      return cdnUrl;
    }
  }

  const resolved = resolveMediaUrl(input);
  if (!resolved || isRejectedSocialImageUrl(resolved)) return fallback;

  if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
    return isRejectedSocialImageUrl(resolved) ? fallback : resolved;
  }

  if (resolved.startsWith("/")) {
    const absolute = `${siteOrigin}${resolved}`;
    return isRejectedSocialImageUrl(absolute) ? fallback : absolute;
  }

  return fallback;
}

export function buildSocialImages(
  keyOrUrl?: string | null,
  alt = "Hub of craftss",
  deps?: SocialImageResolveDeps,
): Pick<Metadata, "openGraph" | "twitter"> {
  const url = resolveSocialImageUrl(keyOrUrl, deps);
  const images = [
    {
      url,
      width: SOCIAL_IMAGE_WIDTH,
      height: SOCIAL_IMAGE_HEIGHT,
      alt,
    },
  ];

  return {
    openGraph: {
      images,
    },
    twitter: {
      card: "summary_large_image",
      images: [url],
    },
  };
}
