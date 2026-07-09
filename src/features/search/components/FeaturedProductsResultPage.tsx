"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ProductCard, ProductCardFragment } from "@/features/products";
import { DocumentType } from "@/gql";
import {
  useDraftProductIds,
  useStorefrontFeaturedProducts,
  type StorefrontProductsInitialData,
} from "@/hooks/useStorefrontProducts";
import SearchProductsGridSkeleton from "./SearchProductsGridSkeleton";

type ProductNode = DocumentType<typeof ProductCardFragment>;

type Props = {
  variables: { first: number; after?: string | null };
  isLastPage: boolean;
  onLoadMore: (cursor: string) => void;
  initialData?: StorefrontProductsInitialData;
  initialDraftIds?: string[];
};

export function FeaturedProductsResultPage({
  variables,
  isLastPage,
  onLoadMore,
  initialData,
  initialDraftIds,
}: Props) {
  const { productsCollection, fetching, error } = useStorefrontFeaturedProducts(
    variables,
    { initialData },
  );
  const { draftIds, draftLoaded } = useDraftProductIds(initialDraftIds);

  const visibleEdges = useMemo(
    () =>
      productsCollection?.edges.filter(({ node }) => !draftIds.has(node.id)) ??
      [],
    [draftIds, productsCollection?.edges],
  );

  const showSkeleton =
    ((fetching && !productsCollection) || !draftLoaded) && !productsCollection;

  if (showSkeleton) {
    return <SearchProductsGridSkeleton />;
  }

  if (error) {
    return <p>Oh no... {error}</p>;
  }

  if (!productsCollection) {
    return null;
  }

  return (
    <div>
      {visibleEdges.length === 0 ? (
        <p>No featured products yet.</p>
      ) : (
        <section className="grid grid-cols-2 lg:grid-cols-4 w-full gap-y-8 gap-x-3 py-5">
          {visibleEdges.map(({ node }, index) => (
            <ProductCard
              key={node.id}
              product={node as ProductNode}
              priorityImage={!variables.after && index < 2}
            />
          ))}
        </section>
      )}

      {isLastPage && productsCollection.pageInfo.hasNextPage && (
        <div className="w-full flex justify-center items-center mt-3">
          <Button
            onClick={() =>
              onLoadMore(productsCollection.pageInfo.endCursor ?? "")
            }
          >
            load more
          </Button>
        </div>
      )}
    </div>
  );
}

export default FeaturedProductsResultPage;
