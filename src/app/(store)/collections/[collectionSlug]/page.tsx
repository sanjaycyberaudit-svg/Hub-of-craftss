import SectionHeading from "@/components/layouts/SectionHeading";
import { Shell } from "@/components/layouts/Shell";
import { Skeleton } from "@/components/ui/skeleton";
import { CollectionBanner } from "@/features/collections";
import { SearchProductsGridSkeleton } from "@/features/products";
import {
  FilterSelections,
  SearchProductsInifiteScroll,
} from "@/features/search";
import { STOREFRONT_REVALIDATE_SECONDS } from "@/lib/cache/constants";
import { getCollectionPageCached } from "@/lib/storefront/collection-detail";
import { getDraftProductIdsCached } from "@/lib/storefront/draft-product-ids";
import { fetchProductSearchCached } from "@/lib/storefront/product-queries";
import { buildShopSearchVariables } from "@/lib/storefront/search-params";
import { toTitleCase, unslugify } from "@/lib/utils";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

export const revalidate = 120;

interface CategoryPageProps {
  params: Promise<{
    collectionSlug: string;
  }>;
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const resolvedParams = await params;
  const collectionName = toTitleCase(unslugify(resolvedParams.collectionSlug));
  const path = `/collections/${resolvedParams.collectionSlug}`;

  return {
    title: `${collectionName} Sarees`,
    description: `Shop ${collectionName} craft supplies at Hub of craftss. Premium terracotta and craft supplies with secure online ordering.`,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: `${collectionName} Sarees | Hub of craftss`,
      description: `Shop ${collectionName} craft supplies at Hub of craftss.`,
      url: path,
    },
  };
}

async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const requestedSlug = decodeURIComponent(
    resolvedParams.collectionSlug,
  ).trim();
  const data = await getCollectionPageCached(requestedSlug);
  const collection = data?.collectionsCollection?.edges?.[0]?.node;

  if (!collection?.id) return notFound();

  if (requestedSlug !== collection.slug) {
    redirect(`/collections/${encodeURIComponent(collection.slug)}`);
  }

  const variables = buildShopSearchVariables(
    resolvedSearchParams,
    collection.id,
  );
  const [initialSearchResult, initialDraftIds] = await Promise.all([
    fetchProductSearchCached(variables),
    getDraftProductIdsCached(),
  ]);

  return (
    <Shell>
      <CollectionBanner collectionBannerData={collection} />
      <SectionHeading
        heading={collection.label}
        description={collection.description}
      />

      <Suspense
        fallback={
          <div>
            <Skeleton className="max-w-xl h-8 mb-3" />
            <Skeleton className="max-w-2xl h-8" />
          </div>
        }
      >
        <FilterSelections shopLayout={false} />
      </Suspense>

      <Suspense fallback={<SearchProductsGridSkeleton />}>
        <SearchProductsInifiteScroll
          collectionId={collection.id}
          initialSearchResult={initialSearchResult}
          initialDraftIds={initialDraftIds}
        />
      </Suspense>
    </Shell>
  );
}

export default CategoryPage;
