import { SearchProductsGridSkeleton } from "@/features/products";
import { Shell } from "@/components/layouts/Shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function StorefrontLoading() {
  return (
    <Shell>
      <div className="space-y-6 py-6">
        <Skeleton className="h-10 w-48 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <SearchProductsGridSkeleton />
      </div>
    </Shell>
  );
}
