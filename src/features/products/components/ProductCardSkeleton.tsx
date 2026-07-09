import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PRODUCT_THUMB_ASPECT_CLASS } from "@/features/products/productThumbnail";

export const ProductCardSkeleton = () => (
  <div className="w-full border rounded-lg">
    <Skeleton className={cn("mb-5 w-full", PRODUCT_THUMB_ASPECT_CLASS)} />
    <div className="space-y-2 mb-8 px-5">
      <Skeleton className="w-[120px] h-6" />
      <Skeleton className="w-[180px] h-4" />
      <Skeleton className="w-[160px] h-4" />
      <Skeleton className="w-[80px] h-4" />
    </div>
  </div>
);

export default ProductCardSkeleton;
