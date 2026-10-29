"use client";

import dynamic from "next/dynamic";

/**
 * Non-critical store chrome: load in the browser only.
 * Keeps Worker SSR cheaper without changing cart/floating behavior after hydrate.
 */
const CartSheet = dynamic(
  () => import("@/features/carts").then((mod) => mod.CartSheet),
  { ssr: false },
);

const StoreFloatingActions = dynamic(
  () =>
    import("@/components/layouts/StoreFloatingActions").then(
      (mod) => mod.StoreFloatingActions,
    ),
  { ssr: false },
);

const WelcomePopups = dynamic(
  () =>
    import("@/features/offers/components/WelcomePopups").then(
      (mod) => mod.WelcomePopups,
    ),
  { ssr: false },
);

const InAppBrowserBanner = dynamic(
  () =>
    import("@/components/layouts/InAppBrowserBanner").then(
      (mod) => mod.InAppBrowserBanner,
    ),
  { ssr: false },
);

export function StoreDeferredChrome() {
  return (
    <>
      <CartSheet />
      <StoreFloatingActions />
      <WelcomePopups />
      <InAppBrowserBanner />
    </>
  );
}
