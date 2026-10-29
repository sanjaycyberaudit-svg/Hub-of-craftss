"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Gift } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { siteConfig } from "@/config/site";
import { useOfferCodesConfig } from "@/providers/OfferCodesProvider";
import {
  getWelcomeGift,
  getWelcomeOfferCode,
  isWelcomeGiftDismissed,
  isWelcomeOfferDismissed,
  loadClaimedOfferCode,
  markWelcomeGiftDismissed,
  WELCOME_OFFER_CLOSED_EVENT,
} from "@/features/offers/lib/welcomeOffer";

const OPEN_DELAY_MS = 1400;
const AFTER_OFFER_DELAY_MS = 600;
/** Safety: don't wait forever if the % offer never closes/notifies. */
const MAX_WAIT_FOR_OFFER_MS = 8000;

type WelcomeGiftDialogProps = {
  /** When true, wait until the % welcome offer is finished before opening. */
  waitForOffer?: boolean;
};

/**
 * Free-gift ladder popup — independent of the % / code welcome offer.
 */
export function WelcomeGiftDialog({
  waitForOffer = true,
}: WelcomeGiftDialogProps) {
  const config = useOfferCodesConfig();
  const router = useRouter();
  const gift = getWelcomeGift(config);
  const offer = getWelcomeOfferCode(config);
  const [open, setOpen] = useState(false);

  const offerStillPending = useCallback(() => {
    if (!waitForOffer || !offer) return false;
    const code = offer.code;
    return !isWelcomeOfferDismissed(code) && loadClaimedOfferCode() !== code;
  }, [offer, waitForOffer]);

  const tryOpen = useCallback(() => {
    if (!gift || isWelcomeGiftDismissed()) return;
    if (offerStillPending()) return;
    setOpen(true);
  }, [gift, offerStillPending]);

  useEffect(() => {
    if (!gift || isWelcomeGiftDismissed()) return;

    if (offerStillPending()) {
      const onOfferClosed = () => {
        window.setTimeout(tryOpen, AFTER_OFFER_DELAY_MS);
      };
      window.addEventListener(WELCOME_OFFER_CLOSED_EVENT, onOfferClosed);
      const fallback = window.setTimeout(tryOpen, MAX_WAIT_FOR_OFFER_MS);
      return () => {
        window.removeEventListener(WELCOME_OFFER_CLOSED_EVENT, onOfferClosed);
        window.clearTimeout(fallback);
      };
    }

    const timer = window.setTimeout(tryOpen, OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [gift, offerStillPending, tryOpen]);

  const closeGift = useCallback(() => {
    markWelcomeGiftDismissed();
    setOpen(false);
  }, []);

  if (!gift) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setOpen(true);
        else closeGift();
      }}
    >
      <DialogContent className="w-[min(100vw-2rem,23rem)] max-w-none overflow-hidden rounded-[1.75rem] border-brand-rose/20 bg-gradient-to-b from-brand-cream via-background to-brand-cream p-0 shadow-[0_24px_60px_-24px_hsl(var(--brand-rose)/0.45)]">
        <div
          className="h-16 w-full bg-gradient-to-b from-brand-rose/20 to-transparent"
          aria-hidden
        />

        <div className="-mt-[3.25rem] flex flex-col items-center px-6 pb-7 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-brand-rose/20 bg-background shadow-md">
            <Gift className="h-7 w-7 text-brand-rose" strokeWidth={1.75} />
          </span>

          <DialogTitle asChild>
            <div className="mt-4 space-y-1">
              <p className="font-[family-name:var(--font-hero-serif)] text-lg font-medium text-foreground/80">
                Free gifts at
              </p>
              <p className="font-[family-name:var(--font-hero-serif)] text-[1.75rem] font-semibold leading-tight text-brand-rose">
                {siteConfig.name}
              </p>
            </div>
          </DialogTitle>

          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            Shop more, unlock free gifts
          </DialogDescription>

          <ul className="mt-5 max-h-56 w-full space-y-1.5 overflow-y-auto overscroll-contain rounded-2xl border border-brand-rose/20 bg-background/60 p-3 text-left">
            {gift.messages.map((line, index) => (
              <li
                key={`${index}-${line.slice(0, 24)}`}
                className="rounded-lg bg-brand-cream/60 px-2.5 py-1.5 text-[11px] leading-snug text-foreground/85 sm:text-xs"
              >
                {line}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => {
              closeGift();
              router.push("/shop");
            }}
            className="mt-5 w-full rounded-xl bg-brand-rose px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] text-white shadow-md transition-colors hover:bg-brand-rose/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-rose/40 touch-manipulation"
          >
            Shop now
          </button>

          <p className="mt-3 text-[10px] text-muted-foreground">
            Gifts apply on qualifying order totals at checkout.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
