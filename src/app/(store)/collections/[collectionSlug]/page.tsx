import { Shell } from "@/components/layouts/Shell";
import { Skeleton } from "@/components/ui/skeleton";
import { CollectionBanner } from "@/features/collections";
import { SearchProductsGridSkeleton } from "@/features/products";
import {
  FilterSelections,
  SearchProductsInifiteScroll,
} from "@/features/search";
import { getCollectionPageCached } from "@/lib/storefront/collection-detail";
import { SectionErrorNotice } from "@/components/errors/SectionErrorNotice";
import { withFallback } from "@/lib/resilience";
import { getDraftProductIdsSafe } from "@/lib/storefront/draft-product-ids";
import {
  fetchProductSearchCached,
  type StorefrontProductSearchResult,
} from "@/lib/storefront/product-queries";
import { buildShopSearchVariables } from "@/lib/storefront/search-params";
import { getProductPackLabelsByIds } from "@/lib/products/pack.server";
import { toTitleCase, unslugify } from "@/lib/utils";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

export const revalidate = 300; // keep in sync with STOREFRONT_REVALIDATE_SECONDS

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
  const slugFallback = toTitleCase(unslugify(resolvedParams.collectionSlug));
  const data = await getCollectionPageCached(resolvedParams.collectionSlug);
  const collection = data?.collectionsCollection?.edges?.[0]?.node;
  const titleName =
    collection?.label?.trim() ||
    (collection?.slug ? toTitleCase(unslugify(collection.slug)) : slugFallback);
  const path = `/collections/${collection?.slug ?? resolvedParams.collectionSlug}`;

  return {
    title: titleName,
    description: `Shop ${titleName} craft supplies at Hub of craftss. Premium terracotta and art & craft materials with secure online ordering.`,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: `${titleName} | Hub of craftss`,
      description: `Shop ${titleName} craft supplies at Hub of craftss.`,
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
  const [searchResult, initialDraftIds] = await Promise.all([
    withFallback<StorefrontProductSearchResult | null>(
      "collection:search",
      () => fetchProductSearchCached(variables),
      null,
    ),
    getDraftProductIdsSafe(),
  ]);

  const productsUnavailable = searchResult === null || initialDraftIds === null;
  const initialSearchResult = searchResult ?? {
    productsCollection: null,
    matchingCollections: [],
  };
  const initialProductIds =
    initialSearchResult?.productsCollection?.edges?.map(
      ({ node }) => node.id,
    ) ?? [];
  const initialPackLabels = await getProductPackLabelsByIds(initialProductIds);

  return (
    <Shell>
      <CollectionBanner collectionBannerData={collection} />

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

      {productsUnavailable ? (
        <SectionErrorNotice
          title="We could not load products in this collection"
          description="This is usually temporary. Please try again in a moment."
        />
      ) : (
        <Suspense fallback={<SearchProductsGridSkeleton />}>
          <SearchProductsInifiteScroll
            collectionId={collection.id}
            initialSearchResult={initialSearchResult}
            initialDraftIds={initialDraftIds ?? []}
            initialPackLabels={initialPackLabels}
          />
        </Suspense>
      )}
    </Shell>
  );
}

export default CategoryPage;
