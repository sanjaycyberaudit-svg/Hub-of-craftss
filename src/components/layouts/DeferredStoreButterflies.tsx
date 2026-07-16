"use client";

import dynamic from "next/dynamic";

/** Decorative homepage animation — browser-only, never blocks Worker HTML. */
const StoreButterflies = dynamic(
  () =>
    import("@/components/layouts/StoreButterflies").then(
      (mod) => mod.StoreButterflies,
    ),
  { ssr: false },
);

export function DeferredStoreButterflies() {
  return <StoreButterflies />;
}
