"use client";

import type { CartProductPricing } from "@/lib/storefront/cart-pricing";
import { useEffect, useMemo, useState } from "react";

type PricingMap = Record<string, CartProductPricing>;

export function useCartLivePricing(productIds: string[]) {
  const idsKey = useMemo(
    () => [...new Set(productIds.filter(Boolean))].sort().join(","),
    [productIds],
  );
  const [pricing, setPricing] = useState<PricingMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idsKey) {
      setPricing({});
      setError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadPricing() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/cart/pricing?ids=${encodeURIComponent(idsKey)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!res.ok) {
          throw new Error("Could not refresh cart prices.");
        }

        const payload = (await res.json()) as { pricing?: PricingMap };
        if (!cancelled) {
          setPricing(payload.pricing ?? {});
        }
      } catch (fetchError) {
        if (cancelled || controller.signal.aborted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Could not refresh cart prices.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPricing();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [idsKey]);

  return { pricing, loading, error };
}

export function calcLiveCartSubtotal(
  quantities: Record<string, { quantity: number }>,
  pricing: PricingMap,
): number {
  return Object.entries(quantities).reduce((total, [productId, item]) => {
    const unitPrice = pricing[productId]?.unitPrice;
    if (!unitPrice || item.quantity <= 0) return total;
    return total + item.quantity * unitPrice;
  }, 0);
}
