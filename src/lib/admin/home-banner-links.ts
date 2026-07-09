export type HomeBannerSlideInput = {
  href?: string | null;
  productId?: string | null;
};

const DEFAULT_BANNER_SUBTITLE = "Discover our latest collections.";
const DEFAULT_BANNER_TITLE_PREFIX = "Banner Slide";

export function buildBannerImageAlt(
  title: string,
  subtitle: string,
  index = 0,
): string {
  const heading = title.trim() || `${DEFAULT_BANNER_TITLE_PREFIX} ${index + 1}`;
  const subheading = subtitle.trim() || DEFAULT_BANNER_SUBTITLE;
  return `${heading} — ${subheading}`;
}

export function buildProductShopHref(slug: string): string {
  const normalized = slug.trim().replace(/^\/+/, "");
  if (!normalized) return "/shop";
  return `/shop/${normalized}`;
}

/** Prefer linked product slug; fall back to manual href. */
export function resolveHomeBannerSlideHref(
  slide: HomeBannerSlideInput,
  productSlugById: Map<string, string>,
): string {
  const productId = String(slide.productId ?? "").trim();
  if (productId) {
    const slug = productSlugById.get(productId);
    if (slug) return buildProductShopHref(slug);
  }

  const href = String(slide.href ?? "").trim();
  return href || "/shop";
}
