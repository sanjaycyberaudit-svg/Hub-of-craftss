import Header from "@/components/layouts/Header";
import { Shell } from "@/components/layouts/Shell";
import { SearchProductsGridSkeleton } from "@/features/products";
import { FeaturedProductsScroll } from "@/features/search";
import { Suspense } from "react";
import { Metadata } from "next";
import { STOREFRONT_REVALIDATE_SECONDS } from "@/lib/cache/constants";
import { getDraftProductIdsCached } from "@/lib/storefront/draft-product-ids";
import { fetchFeaturedProductsCached } from "@/lib/storefront/product-queries";

export const revalidate = STOREFRONT_REVALIDATE_SECONDS;

export const metadata: Metadata = {
  title: "Featured Sarees",
  description:
    "Discover handpicked featured sarees at SRI SAI RAGHAVENDRA TEX — premium styles for weddings, festivals and special occasions.",
  alternates: {
    canonical: "/featured",
  },
  openGraph: {
    title: "Featured Sarees | SRI SAI RAGHAVENDRA TEX",
    description:
      "Discover handpicked featured sarees at SRI SAI RAGHAVENDRA TEX for weddings and festivals.",
    url: "/featured",
  },
};

const FEATURED_PAGE_SIZE = 12;

async function FeaturedProductsPage() {
  const variables = { first: FEATURED_PAGE_SIZE, after: undefined };
  const [productsCollection, initialDraftIds] = await Promise.all([
    fetchFeaturedProductsCached(variables),
    getDraftProductIdsCached(),
  ]);

  return (
    <Shell>
      <Header
        heading="Featured Products"
        description="Our handpicked sarees — premium styles for festivals and weddings"
      />

      <Suspense fallback={<SearchProductsGridSkeleton />}>
        <FeaturedProductsScroll
          initialData={{ productsCollection }}
          initialDraftIds={initialDraftIds}
        />
      </Suspense>
    </Shell>
  );
}

export default FeaturedProductsPage;
