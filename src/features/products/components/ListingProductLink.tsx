"use client";

import { LISTING_PRODUCT_OPEN_EVENT } from "@/hooks/useListingNavigationState";
import Link from "next/link";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  productId: string;
  href: string;
};

/**
 * Records which card opened the PDP. The active listing owns the corresponding
 * pagination/scroll snapshot and restores focus to this link on Back.
 */
export function ListingProductLink({
  productId,
  onClick,
  children,
  ...props
}: Props) {
  return (
    <Link
      {...props}
      data-product-id={productId}
      onClick={(event) => {
        window.dispatchEvent(
          new CustomEvent(LISTING_PRODUCT_OPEN_EVENT, {
            detail: { productId },
          }),
        );
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
