"use client";

import { cn, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { INDIAN_STATES } from "@/features/addresses/constants/indianStates";
import type { CourierChargeBreakdown } from "@/lib/courier/calculate";

export type CartOrderSummaryFieldsProps = {
  productCount: number;
  courierEnabled: boolean;
  offerCodesEnabled: boolean;
  deliveryState: string;
  onStateChange: (state: string) => void;
  hasDeliveryStateSelected: boolean;
  promoInput: string;
  onPromoInputChange: (value: string) => void;
  onApplyPromo: () => void;
  appliedPromoCode: string | null;
  promoPercentage: number;
  onRemovePromo: () => void;
  subtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  courierBreakdown: CourierChargeBreakdown | null;
  gstEnabled: boolean;
  gstAmount: number;
  totalAmount: number;
};

/** Delivery state, promo code, and price breakdown shown in cart checkout. */
export function CartOrderSummaryFields({
  courierEnabled,
  offerCodesEnabled,
  deliveryState,
  onStateChange,
  hasDeliveryStateSelected,
  promoInput,
  onPromoInputChange,
  onApplyPromo,
  appliedPromoCode,
  promoPercentage,
  onRemovePromo,
  subtotal,
  discountAmount,
  discountedSubtotal,
  courierBreakdown,
  gstEnabled,
  gstAmount,
  totalAmount,
}: CartOrderSummaryFieldsProps) {
  const totalReady = !courierEnabled || Boolean(courierBreakdown);

  return (
    <>
      {courierEnabled ? (
        <>
          <label className="mb-3 block text-xs font-medium text-muted-foreground">
            Delivery state
          </label>
          <select
            className={cn(
              "mb-1 w-full rounded-md border bg-background px-3 py-2 text-sm",
              !hasDeliveryStateSelected &&
                "border-destructive ring-1 ring-destructive/30",
            )}
            value={deliveryState}
            onChange={(event) => onStateChange(event.target.value)}
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          {!hasDeliveryStateSelected ? (
            <p className="mb-3 text-xs text-destructive">
              Delivery state is required to continue checkout.
            </p>
          ) : (
            <div className="mb-3" />
          )}
        </>
      ) : null}

      {offerCodesEnabled ? (
        <>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            Promo code
          </label>
          <div className="mb-4 flex items-center gap-2">
            <Input
              value={promoInput}
              onChange={(event) =>
                onPromoInputChange(
                  event.target.value.toUpperCase().replace(/\s+/g, ""),
                )
              }
              placeholder="ENTER CODE"
              className="h-9"
            />
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={onApplyPromo}
            >
              Apply
            </Button>
          </div>
          {appliedPromoCode ? (
            <div className="mb-3 flex items-center justify-between rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
              <span>
                {appliedPromoCode} ({promoPercentage}%)
              </span>
              <button type="button" onClick={onRemovePromo}>
                Remove
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        {offerCodesEnabled ? (
          <>
            <div className="flex items-center justify-between">
              <span>Discount</span>
              <span>
                {promoPercentage > 0
                  ? `- ${formatPrice(discountAmount)}`
                  : formatPrice(0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Subtotal after discount</span>
              <span>{formatPrice(discountedSubtotal)}</span>
            </div>
          </>
        ) : null}
        {courierEnabled ? (
          <div className="flex items-center justify-between">
            <span>Courier</span>
            <span>
              {courierBreakdown
                ? formatPrice(courierBreakdown.charge)
                : "Select state"}
            </span>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <span>GST</span>
          <span>{gstEnabled ? formatPrice(gstAmount) : "Not applied"}</span>
        </div>
        <div className="flex items-center justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span>{totalReady ? formatPrice(totalAmount) : "Select state"}</span>
        </div>
      </div>
    </>
  );
}
