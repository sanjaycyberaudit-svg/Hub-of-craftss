/** Default ISR / Data Cache TTL for storefront reads (seconds). */
export const STOREFRONT_REVALIDATE_SECONDS = 120;

/** Longer TTL for mostly-static marketing pages. */
export const STOREFRONT_STATIC_REVALIDATE_SECONDS = 3600;

export const CACHE_TAGS = {
  products: "storefront-products",
  drafts: "storefront-product-drafts",
  sizeConfig: "storefront-size-config",
  settings: "storefront-settings",
  collections: "storefront-collections",
} as const;
