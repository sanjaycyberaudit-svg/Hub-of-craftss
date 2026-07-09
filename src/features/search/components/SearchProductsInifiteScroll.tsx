"use client";

import type { StorefrontProductSearchResult } from "@/lib/storefront/product-queries";
import { buildShopSearchVariables } from "@/lib/storefront/search-params";
import { ReadonlyURLSearchParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import SearchResultPage from "./SearchResultPage";

interface SearchProductsInifiteScrollProps {
  collectionId?: string;
  initialSearchResult?: StorefrontProductSearchResult;
  initialDraftIds?: string[];
}

function SearchProductsInifiteScroll({
  collectionId,
  initialSearchResult,
  initialDraftIds,
}: SearchProductsInifiteScrollProps) {
  const searchParmas = useSearchParams();
  const varaibles = searchParamsVariablesFactory(searchParmas, collectionId);

  const [pageVariables, setPageVariables] = useState([varaibles]);

  useEffect(() => {
    setPageVariables([
      searchParamsVariablesFactory(searchParmas, collectionId),
    ]);
  }, [searchParmas, collectionId]);

  const loadMoreHandler = (after: string) => {
    setPageVariables([...pageVariables, { ...varaibles, after, first: 8 }]);
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
