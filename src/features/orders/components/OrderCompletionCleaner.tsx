"use client";

import { useEffect } from "react";
import useCartStore from "@/features/carts/useCartStore";

type Props = {
  clearGuestCart: boolean;
};

/**
 * Clears persisted guest cart after a confirmed paid order.
 * Server-side paid status check prevents accidental cart wipe on failed orders.
 */
export function OrderCompletionCleaner({ clearGuestCart }: Props) {
  const removeAllProducts = useCartStore((s) => s.removeAllProducts);

  useEffect(() => {
    if (!clearGuestCart) return;
    removeAllProducts();
  }, [clearGuestCart, removeAllProducts]);

  return null;
}

export default OrderCompletionCleaner;
