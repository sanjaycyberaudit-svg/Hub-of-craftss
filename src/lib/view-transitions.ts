import type { CSSProperties } from "react";

export function productImageTransitionName(productId: string): string {
  return `product-image-${productId}`;
}

export function collectionImageTransitionName(collectionId: string): string {
  return `collection-image-${collectionId}`;
}

export function viewTransitionStyle(name: string): CSSProperties {
  return { viewTransitionName: name } as CSSProperties;
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => {
    finished: Promise<void>;
  };
};

/** Smooth morph when the browser supports View Transitions API. */
export function startViewTransition(
  callback: () => void | Promise<void>,
): void {
  if (typeof document === "undefined") {
    void callback();
    return;
  }

  const doc = document as DocumentWithViewTransition;
  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(callback);
    return;
  }

  void callback();
}
