import { Shell } from "@/components/layouts/Shell";
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
import { getHomeBannerSlides } from "@/lib/integrations/settings";
import { getDraftProductIdsCached } from "@/lib/storefront/draft-product-ids";
import { getLandingPageDataCached } from "@/lib/storefront/landing-data";
import { getShopByPriceBucketsCached } from "@/lib/storefront/shop-by-price";
import { resolveStorefrontContact } from "@/lib/integrations/settings";
import type { Metadata } from "next";

export const revalidate = 300;

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

export default async function Home() {
  const [homeBannerSlides, data, draftProductIds, contact, priceBuckets] =
    await Promise.all([
      getHomeBannerSlides(),
      getLandingPageDataCached(),
      getDraftProductIdsCached(),
      resolveStorefrontContact(),
      getShopByPriceBucketsCached(),
    ]);

  const draftIds = new Set(draftProductIds);
  const products = data?.products;
  const featuredProducts =
    products?.edges?.filter((edge) => !draftIds.has(edge.node.id)) ?? [];
  const collectionScrollCards = data?.collectionScrollCards;
  const homeTestimonials = data?.homeTestimonials;
  const slides = homeBannerSlides?.length ? homeBannerSlides : heroSlides;

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden">
      <HomeHeroCarousel slides={slides} />

      <Shell>
        {!data ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 my-6 text-sm">
            <p className="font-semibold mb-2">Store data not loaded</p>
            <p className="text-muted-foreground mb-2">
              Enable GraphQL in Supabase: SQL Editor → run{" "}
              <code className="bg-white px-1">
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
        <TrustFeatures phone={contact.phone} />
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
    },
    {
      Icon: Icons.cart,
      title: "Contact Support",
      description: `Call ${phone} or email us anytime.`,
    },
    {
      Icon: Icons.tag,
      title: "Easy Replacement",
      description: "Simple returns on eligible items.",
    },
    {
      Icon: Icons.award,
      title: "Secure Checkout",
      description: "Safe, trusted payment flow.",
    },
  ];

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10 py-10 md:py-16 border-t">
      {features.map(({ Icon, title, description }, index) => (
        <div className="text-center px-2" key={`trust_${index}`}>
          <div className="flex justify-center mb-3">
            <Icon className="h-9 w-9 text-primary/80" />
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
