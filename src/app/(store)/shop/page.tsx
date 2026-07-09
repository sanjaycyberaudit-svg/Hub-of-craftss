import Header from "@/components/layouts/Header";
import { Shell } from "@/components/layouts/Shell";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchProductsGridSkeleton } from "@/features/products";
import {
  FilterSelections,
  SearchProductsInifiteScroll,
} from "@/features/search";
import { STOREFRONT_REVALIDATE_SECONDS } from "@/lib/cache/constants";
import { getAllCollectionsCached } from "@/lib/storefront/collections-list";
import { getDraftProductIdsCached } from "@/lib/storefront/draft-product-ids";
import { fetchProductSearchCached } from "@/lib/storefront/product-queries";
import {
  buildShopSearchVariables,
  formatShopPriceRangeHeading,
} from "@/lib/storefront/search-params";
import type { Metadata } from "next";
import { Suspense } from "react";

export const revalidate = STOREFRONT_REVALIDATE_SECONDS;

export const metadata: Metadata = {
  title: "Shop All Sarees",
  description:
    "Browse all silk, cotton, wedding and festive sarees at SRI SAI RAGHAVENDRA TEX. Shop online with secure checkout and delivery across India.",
  alternates: {
    canonical: "/shop",
  },
  openGraph: {
    title: "Shop All Sarees | SRI SAI RAGHAVENDRA TEX",
    description:
      "Browse all silk, cotton, wedding and festive sarees at SRI SAI RAGHAVENDRA TEX.",
    url: "/shop",
  },
};

interface ProductsPageProps {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
}

async function ProductsPage({ searchParams }: ProductsPageProps) {
  const variables = buildShopSearchVariables(searchParams);
  const priceHeading = formatShopPriceRangeHeading(searchParams);
  const [initialSearchResult, initialDraftIds, collectionsData] =
    await Promise.all([
      fetchProductSearchCached(variables),
      getDraftProductIdsCached(),
      getAllCollectionsCached(),
    ]);

  const collectionsSection =
    collectionsData?.edges?.map(({ node }) => ({
      id: node.id,
      label: node.label,
    })) ?? [];

  return (
    <Shell>
      <Header
        heading={priceHeading ? "Shop by Price" : "Shop Now"}
        description={
          priceHeading
            ? `Sarees priced ${priceHeading}. Use filters below to refine further.`
            : undefined
        }
      />

      <Suspense
        fallback={
          <div>
            <Skeleton className="mb-3 h-8 max-w-xl" />
            <Skeleton className="h-8 max-w-2xl" />
          </div>
        }
      >
        <FilterSelections collectionsSection={collectionsSection} />
      </Suspense>

      <Suspense fallback={<SearchProductsGridSkeleton />}>
        <SearchProductsInifiteScroll
          initialSearchResult={initialSearchResult}
          initialDraftIds={initialDraftIds}
        />
      </Suspense>
    </Shell>
  );
}

export default ProductsPage;
