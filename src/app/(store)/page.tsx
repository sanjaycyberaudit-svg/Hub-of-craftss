import { Shell } from "@/components/layouts/Shell";
import { DeferredStoreButterflies } from "@/components/layouts/DeferredStoreButterflies";
import { Icons } from "@/components/layouts/icons";
import {
  HomeHeroCarousel,
  HomeCategoriesCarousel,
  HomePriceCarousel,
  HomeTestimonialsCarousel,
  HomeShoppableReels,
  HomeExploreLinks,
} from "@/features/storefront/components";
import { heroSlides } from "@/config/heroSlides";
import { getHomeBannerSlidesCached } from "@/lib/integrations/settings";
import { getDraftProductIdsCached } from "@/lib/storefront/draft-product-ids";
import { getLandingPageDataCached } from "@/lib/storefront/landing-data";
import { getShopByPriceBucketsCached } from "@/lib/storefront/shop-by-price";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Hub of craftss | Make · Craft · Create",
  description:
    "Shop terracotta raw materials and art & craft supplies at Hub of craftss by Shaaru in Madurai. Make · Craft · Create.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Hub of craftss | Make · Craft · Create",
    description:
      "Shop terracotta raw materials and art & craft supplies at Hub of craftss by Shaaru in Madurai.",
    url: "/",
  },
};

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  label: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => {
          console.error(`[home] ${label} timed out after ${ms}ms`);
          resolve(fallback);
        }, ms);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export default async function Home() {
  const [homeBannerSlides, data, draftProductIds, priceBuckets] =
    await Promise.all([
      withTimeout(getHomeBannerSlidesCached(), 5000, null, "homeBanner"),
      withTimeout(getLandingPageDataCached(), 5000, null, "landing"),
      withTimeout(getDraftProductIdsCached(), 5000, [], "drafts"),
      withTimeout(getShopByPriceBucketsCached(), 5000, [], "priceBuckets"),
    ]);

  // Contact comes from store layout providers; use site default for this section only.
  const phone = siteConfig.phone;

  const draftIds = new Set(draftProductIds);
  const products = data?.products;
  const featuredProducts =
    products?.edges?.filter((edge) => !draftIds.has(edge.node.id)) ?? [];
  const collectionScrollCards = data?.collectionScrollCards;
  const homeTestimonials = data?.homeTestimonials;
  const slides = homeBannerSlides?.length ? homeBannerSlides : heroSlides;

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden">
      <DeferredStoreButterflies />
      <HomeHeroCarousel slides={slides} />

      <Shell>
        {!data ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 my-6 text-sm">
            <p className="font-semibold mb-2">Store data not loaded</p>
            <p className="text-muted-foreground mb-2">
              Enable GraphQL in Supabase: SQL Editor → run{" "}
              <code className="bg-card px-1">
                supabase/02-enable-graphql.sql
              </code>
            </p>
          </div>
        ) : null}

        {collectionScrollCards?.edges?.length ? (
          <HomeCategoriesCarousel collections={collectionScrollCards.edges} />
        ) : null}

        {priceBuckets.length ? (
          <HomePriceCarousel buckets={priceBuckets} />
        ) : null}

        {featuredProducts.length ? (
          <HomeShoppableReels products={featuredProducts} />
        ) : null}

        {homeTestimonials?.edges?.length ? (
          <HomeTestimonialsCarousel testimonials={homeTestimonials.edges} />
        ) : null}

        <HomeExploreLinks />
        <TrustFeatures phone={phone} />
      </Shell>
    </main>
  );
}

function TrustFeatures({ phone }: { phone: string }) {
  const features = [
    {
      Icon: Icons.package,
      title: "Affordable Shipping",
      description: "Low delivery charges for orders across India.",
      iconClass: "text-brand-rose",
    },
    {
      Icon: Icons.cart,
      title: "Contact Support",
      description: `Call ${phone} or email us anytime.`,
      iconClass: "text-brand-gold",
    },
    {
      Icon: Icons.tag,
      title: "Easy Replacement",
      description: "Simple returns on eligible items.",
      iconClass: "text-brand-rose",
    },
    {
      Icon: Icons.award,
      title: "Secure Checkout",
      description: "Safe, trusted payment flow.",
      iconClass: "text-brand-gold",
    },
  ];

  return (
    <section className="craft-stitch grid grid-cols-2 gap-6 rounded-2xl border-brand-gold/30 bg-card/80 px-3 py-10 md:grid-cols-4 md:gap-10 md:px-6 md:py-16">
      {features.map(({ Icon, title, description, iconClass }, index) => (
        <div className="text-center px-2" key={`trust_${index}`}>
          <div className="mb-3 flex justify-center">
            <span
              className={cn(
                "inline-flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-[0_8px_24px_-12px_rgba(192,48,120,0.35)] ring-1 ring-brand-rose/15",
              )}
            >
              <Icon className={cn("h-6 w-6", iconClass)} />
            </span>
          </div>
          <h4 className="text-sm md:text-base font-semibold mb-1">{title}</h4>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      ))}
    </section>
  );
}
