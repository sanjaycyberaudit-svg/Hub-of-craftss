import Header from "@/components/layouts/Header";
import ProductCard from "./ProductCard";
import { getDraftProductIdsCached } from "@/lib/storefront/draft-product-ids";
import { getRecommendationProductsCached } from "@/lib/storefront/recommendations";

type Props = {
  first?: number;
  className?: string;
};

export default async function RecommendationProductsSection({
  first = 4,
}: Props) {
  const [data, draftProductIds] = await Promise.all([
    getRecommendationProductsCached(first),
    getDraftProductIdsCached(),
  ]);

  const draftIds = new Set(draftProductIds);
  const edges =
    data?.recommendations?.edges?.filter(
      (edge) => !draftIds.has(edge.node.id),
    ) ?? [];

  if (edges.length === 0) return null;

  return (
    <Header heading={`We Think You'll Love`}>
      <div className="container grid grid-cols-2 gap-x-8 lg:grid-cols-4">
        {edges.map(({ node }) => (
          <ProductCard key={node.id} product={node} />
        ))}
      </div>
    </Header>
  );
}
