"use client";

import { useEffect, useRef } from "react";

type Options = {
  /** When false, the observer is disconnected (e.g. no next page / already loading). */
  enabled: boolean;
  onLoadMore: () => void;
  /** Scroll container; omit/null to use the viewport. */
  root?: Element | null;
  rootMargin?: string;
};

/**
 * Fires `onLoadMore` when the returned sentinel scrolls into view.
 * Used for infinite product grids and media galleries instead of "Load more".
 */
export function useInfiniteScrollSentinel({
  enabled,
  onLoadMore,
  root = null,
  rootMargin = "280px 0px",
}: Options) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !enabled) return;

    // One shot per "enabled" window so a sticky sentinel cannot spam page loads.
    let armed = true;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!armed) return;
        if (entries.some((entry) => entry.isIntersecting)) {
          armed = false;
          onLoadMoreRef.current();
        }
      },
      { root, rootMargin, threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, root, rootMargin]);

  return sentinelRef;
}
