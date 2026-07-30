"use client";

import type { StorefrontProductSearchResult } from "@/lib/storefront/product-queries";
import { buildShopSearchVariables } from "@/lib/storefront/search-params";
import { useListingNavigationState } from "@/hooks/useListingNavigationState";
import {
  ReadonlyURLSearchParams,
  usePathname,
  useSearchParams,
} from "next/navigation";
import SearchResultPage from "./SearchResultPage";

interface SearchProductsInifiteScrollProps {
  collectionId?: string;
  initialSearchResult?: StorefrontProductSearchResult;
  initialDraftIds?: string[];
  initialPackLabels?: Record<string, string | null>;
}

function SearchProductsInifiteScroll({
  collectionId,
  initialSearchResult,
  initialDraftIds,
  initialPackLabels,
}: SearchProductsInifiteScrollProps) {
  const searchParmas = useSearchParams();
  const pathname = usePathname();
  const varaibles = searchParamsVariablesFactory(searchParmas, collectionId);
  const listingKey = `${pathname}?${searchParmas.toString()}`;

  const [pageVariables, setPageVariables] = useListingNavigationState(
    listingKey,
    () => [varaibles],
  );

  const loadMoreHandler = (after: string) => {
    setPageVariables((prev) => {
      if (prev.some((page) => page.after === after)) return prev;
      return [...prev, { ...varaibles, after, first: 8 }];
    });
  };

  return (
    <section>
      {pageVariables.map((variable, i) => (
        <SearchResultPage
          key={"" + variable.after}
          variables={variable}
          collectionId={collectionId}
          isLastPage={i === pageVariables.length - 1}
          showMatchingCollections={i === 0}
          onLoadMore={loadMoreHandler}
          initialData={i === 0 ? initialSearchResult : undefined}
          initialDraftIds={i === 0 ? initialDraftIds : undefined}
          initialPackLabels={i === 0 ? initialPackLabels : undefined}
        />
      ))}
    </section>
  );
}

export default SearchProductsInifiteScroll;

const searchParamsVariablesFactory = (
  searchParams: ReadonlyURLSearchParams,
  collectionId?: string,
) => buildShopSearchVariables(searchParams, collectionId);
