"use client";

import type { StorefrontProductsInitialData } from "@/hooks/useStorefrontProducts";
import { useState } from "react";
import FeaturedProductsResultPage from "./FeaturedProductsResultPage";

const PAGE_SIZE = 12;

type Props = {
  initialData?: StorefrontProductsInitialData;
  initialDraftIds?: string[];
};

export function FeaturedProductsScroll({
  initialData,
  initialDraftIds,
}: Props) {
  const [pageVariables, setPageVariables] = useState([
    { first: PAGE_SIZE, after: undefined as string | undefined },
  ]);

  const loadMoreHandler = (after: string) => {
    setPageVariables((prev) => [...prev, { first: PAGE_SIZE, after }]);
  };

  return (
    <section>
      {pageVariables.map((variable, i) => (
        <FeaturedProductsResultPage
          key={String(variable.after ?? "initial")}
          variables={variable}
          isLastPage={i === pageVariables.length - 1}
          onLoadMore={loadMoreHandler}
          initialData={i === 0 ? initialData : undefined}
          initialDraftIds={i === 0 ? initialDraftIds : undefined}
        />
      ))}
    </section>
  );
}

export default FeaturedProductsScroll;
