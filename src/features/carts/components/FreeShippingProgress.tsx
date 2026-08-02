"use client";

import type { CourierChargesConfig } from "@/lib/courier/calculate";
import { getFreeShippingProgress } from "@/lib/courier/free-shipping-progress";
import { cn, formatPrice } from "@/lib/utils";

type FreeShippingProgressProps = {
  discountedSubtotal: number;
  config: Pick<
    CourierChargesConfig,
    "enabled" | "freeShippingEnabled" | "freeShippingMin"
  >;
  className?: string;
};

export function FreeShippingProgress({
  discountedSubtotal,
  config,
  className,
}: FreeShippingProgressProps) {
  const progress = getFreeShippingProgress({
    orderAmount: discountedSubtotal,
    config,
  });
  if (!progress) return null;

  const percent = Math.round(progress.progress * 100);

  return (
    <div
      role="status"
      className={cn(
        "col-span-12 rounded-md border border-border bg-muted/40 px-3 py-3 md:col-span-9",
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground">
        {progress.unlocked
          ? "You've unlocked Free Shipping"
          : `Add items worth ${formatPrice(progress.remaining)} to get Free Shipping`}
      </p>

      <div className="mt-3">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.threshold}
          aria-valuenow={Math.min(progress.orderAmount, progress.threshold)}
          aria-label="Free shipping progress"
          className="relative h-2 w-full overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatPrice(progress.orderAmount)}</span>
          <span>Free Shipping · {formatPrice(progress.threshold)}</span>
        </div>
      </div>
    </div>
  );
}
