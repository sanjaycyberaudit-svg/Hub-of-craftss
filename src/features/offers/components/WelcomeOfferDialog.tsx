"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Gift } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { siteConfig } from "@/config/site";
import { useAuth } from "@/providers/AuthProvider";
import { useOfferCodesConfig } from "@/providers/OfferCodesProvider";
import { isSafeRedirectPath } from "@/lib/auth/redirect";
import {
  getWelcomeOfferCode,
  isWelcomeOfferDismissed,
  loadClaimedOfferCode,
  markWelcomeOfferDismissed,
  saveClaimedOfferCode,
} from "@/features/offers/lib/welcomeOffer";
import { useWelcomeOfferEligibility } from "@/features/offers/hooks/useWelcomeOfferEligibility";

/** Let the page paint before the offer interrupts the visitor. */
const OPEN_DELAY_MS = 1400;

/**
 * First-visit welcome offer built from the first enabled admin offer code.
 * Guests are sent to sign up; signed-in shoppers get the code auto-applied at checkout.
 */
export function WelcomeOfferDialog() {
  const offerCodesConfig = useOfferCodesConfig();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [unseen, setUnseen] = useState(false);

  const offer = getWelcomeOfferCode(offerCodesConfig);
  const code = offer?.code ?? null;
  // Only visitors who have not seen or claimed the offer cost an eligibility call.
  const { eligible } = useWelcomeOfferEligibility(unseen);

  useEffect(() => {
    if (!code) return;
    setUnseen(
      !isWelcomeOfferDismissed(code) && loadClaimedOfferCode() !== code,
    );
  }, [code]);

  useEffect(() => {
    if (!unseen || eligible !== true) return;

    const timer = window.setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [unseen, eligible]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next && code) markWelcomeOfferDismissed(code);
    },
    [code],
  );

  const handleClaim = useCallback(() => {
    if (!code) return;

    saveClaimedOfferCode(code);
    markWelcomeOfferDismissed(code);
    setOpen(false);

    if (user) {
      toast({
        title: "Offer saved",
        description: `${code} will be applied on your first order.`,
      });
      router.push("/shop");
      return;
    }

    const from = isSafeRedirectPath(pathname) ? pathname : "/shop";
    router.push(`/sign-up?from=${encodeURIComponent(from)}`);
  }, [code, pathname, router, toast, user]);

  if (!offer || !code) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
                Welcome to
              </p>
              <p className="font-[family-name:var(--font-hero-serif)] text-[1.75rem] font-semibold leading-tight text-brand-rose">
                {siteConfig.name}
              </p>
            </div>
          </DialogTitle>

          <p className="mt-1 text-sm text-muted-foreground">
            {siteConfig.tagline}
          </p>

          <div
            className="mt-5 flex w-full items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
            aria-hidden
          >
            <span className="h-px flex-1 bg-brand-rose/25" />
            Enjoy
            <span className="h-px flex-1 bg-brand-rose/25" />
          </div>

          <p className="mt-3 font-[family-name:var(--font-hero-serif)] text-[2.75rem] font-bold leading-none text-brand-rose">
            {offer.percentage}% OFF
          </p>
          <DialogDescription className="mt-1 text-base text-foreground/70">
            on your first order
          </DialogDescription>

          <div className="mt-5 w-full rounded-2xl border border-dashed border-brand-rose/45 bg-background/70 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Use code
            </p>
            <p className="mt-1 text-xl font-bold tracking-[0.14em] text-brand-rose">
              {code}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClaim}
            className="mt-5 w-full rounded-xl bg-brand-rose px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] text-white shadow-md transition-colors hover:bg-brand-rose/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-rose/40 touch-manipulation"
          >
            Claim offer
          </button>

          <p className="mt-3 text-[10px] text-muted-foreground">
            {user
              ? "Applied automatically on your first order."
              : "Sign up to claim. Valid for first-time customers only."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
