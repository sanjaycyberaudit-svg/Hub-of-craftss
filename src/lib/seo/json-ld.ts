import { siteConfig } from "@/config/site";
import { SEO_PRIMARY_NAV } from "@/lib/seo/constants";
import { SEO_BRAND_ASSETS } from "@/lib/seo/brand-assets";
import { getURL } from "@/lib/utils";

function siteOrigin() {
  return getURL().replace(/\/$/, "");
}

function absoluteUrl(path = "") {
  const origin = siteOrigin();
  if (!path) return origin;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalizedPath}`;
}

function brandName() {
  return siteConfig.name.replace("®", "").trim();
}

function socialSameAs() {
  return Object.values(siteConfig.social).filter(
    (url) => typeof url === "string" && url.trim().length > 0,
  );
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brandName(),
    alternateName: [
      siteConfig.tradeName,
      siteConfig.shortName,
      "Hubs of craftss",
    ],
    url: absoluteUrl(),
    logo: absoluteUrl(SEO_BRAND_ASSETS.logo),
    image: [
      absoluteUrl(SEO_BRAND_ASSETS.icon512),
      absoluteUrl(SEO_BRAND_ASSETS.ogShare),
    ],
    description: siteConfig.description,
    email: siteConfig.email || undefined,
    telephone: siteConfig.phone || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.addressLines.slice(0, 2).join(", "),
      addressLocality: "Madurai",
      addressRegion: "Tamil Nadu",
      postalCode: "625107",
      addressCountry: "IN",
    },
    sameAs: socialSameAs(),
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brandName(),
    url: absoluteUrl(),
    description: siteConfig.description,
    inLanguage: "en-IN",
    publisher: {
      "@type": "Organization",
      name: brandName(),
      logo: absoluteUrl(SEO_BRAND_ASSETS.logo),
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/shop")}?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildStoreJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: brandName(),
    url: absoluteUrl(),
    image: [
      absoluteUrl(SEO_BRAND_ASSETS.icon512),
      absoluteUrl(SEO_BRAND_ASSETS.ogShare),
    ],
    logo: absoluteUrl(SEO_BRAND_ASSETS.logo),
    description: siteConfig.description,
    telephone: siteConfig.phone || undefined,
    email: siteConfig.email || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.address,
      addressLocality: "Madurai",
      addressRegion: "Tamil Nadu",
      postalCode: "625107",
      addressCountry: "IN",
    },
    priceRange: "₹₹",
    currenciesAccepted: "INR",
    paymentAccepted: "UPI, Credit Card, Debit Card, Net Banking",
  };
}

export function buildSiteNavigationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Hub of craftss primary navigation",
    itemListElement: SEO_PRIMARY_NAV.map((item, index) => ({
      "@type": "SiteNavigationElement",
      position: index + 1,
      name: item.name,
      description: item.description,
      url: absoluteUrl(item.href),
    })),
  };
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildProductJsonLd(input: {
  name: string;
  slug: string;
  description?: string | null;
  price: string | number;
  imageUrl?: string | null;
  inStock?: boolean;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description ?? `Buy ${input.name} from Hub of craftss.`,
    image: input.imageUrl ? [input.imageUrl] : undefined,
    sku: input.slug,
    brand: {
      "@type": "Brand",
      name: brandName(),
    },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/shop/${input.slug}`),
      priceCurrency: siteConfig.currency,
      price: Number(input.price),
      availability: input.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
}
