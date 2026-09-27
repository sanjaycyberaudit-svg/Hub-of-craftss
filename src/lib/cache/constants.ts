/** Default storefront Redis / Data Cache freshness (30 minutes). Admin invalidate still clears immediately. */
export const STOREFRONT_REVALIDATE_SECONDS = 1800;

/**
 * Edge (CDN) cache for public storefront JSON APIs. Admin invalidation cannot
 * purge these URL-keyed responses, so this bounds how long an edit takes to show.
 */
export const STOREFRONT_API_CDN_SECONDS = 60;

/** Longer TTL for mostly-static marketing pages. */
export const STOREFRONT_STATIC_REVALIDATE_SECONDS = 3600;

export const CACHE_TAGS = {
  products: "storefront-products",
  drafts: "storefront-product-drafts",
  sizeConfig: "storefront-size-config",
  settings: "storefront-settings",
  collections: "storefront-collections",
} as const;
