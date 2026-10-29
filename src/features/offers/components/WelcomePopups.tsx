"use client";

import { WelcomeGiftDialog } from "./WelcomeGiftDialog";
import { WelcomeOfferDialog } from "./WelcomeOfferDialog";

/** Mounts the % welcome offer and free-gift popups as independent admin options. */
export function WelcomePopups() {
  return (
    <>
      <WelcomeOfferDialog />
      <WelcomeGiftDialog />
    </>
  );
}
