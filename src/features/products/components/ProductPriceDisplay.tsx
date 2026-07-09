import { cn, formatPrice } from "@/lib/utils";
import {
  formatDiscountBadgeLabel,
  getOriginalProductPrice,
  getSaleProductPrice,
  isProductDiscountActive,
  type ProductDiscountFields,
} from "@/lib/products/discount";

type ProductPriceDisplayProps = {
  product: ProductDiscountFields;
  className?: string;
  saleClassName?: string;
  originalClassName?: string;
  layout?: "inline" | "stacked";
};

export function ProductPriceDisplay({
  product,
  className,
  saleClassName,
  originalClassName,
  layout = "stacked",
}: ProductPriceDisplayProps) {
  const onSale = isProductDiscountActive(product);
  const salePrice = getSaleProductPrice(product);
  const originalPrice = getOriginalProductPrice(product);

  if (!onSale) {
    return (
      <div className={cn("font-medium text-foreground", className)}>
        {formatPrice(salePrice)}
      </div>
    );
  }

  if (layout === "inline") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-baseline gap-x-2 gap-y-0.5",
          className,
        )}
      >
        <span className={cn("font-semibold text-destructive", saleClassName)}>
          {formatPrice(salePrice)}
        </span>
        <span
          className={cn(
            "text-sm text-muted-foreground line-through",
            originalClassName,
          )}
        >
          {formatPrice(originalPrice)}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-0.5", className)}>
      <div className={cn("font-semibold text-destructive", saleClassName)}>
        {formatPrice(salePrice)}
      </div>
      <div
        className={cn(
          "text-sm text-muted-foreground line-through",
          originalClassName,
        )}
      >
        {formatPrice(originalPrice)}
      </div>
    </div>
  );
}

type ProductDiscountBadgeProps = {
  product: ProductDiscountFields;
  className?: string;
};

export function ProductDiscountBadge({
  product,
  className,
}: ProductDiscountBadgeProps) {
  if (!isProductDiscountActive(product)) return null;

  const percent = Number(product.discountPercent);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-secondary bg-secondary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-foreground shadow-sm",
        className,
      )}
    >
      {formatDiscountBadgeLabel(percent)}
    </span>
  );
}
