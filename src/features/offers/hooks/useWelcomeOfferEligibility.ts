"use client";

import { useEffect, useState } from "react";
import { fetchWithTimeout } from "@/lib/network/fetchWithTimeout";
import { useAuth } from "@/providers/AuthProvider";
import type { WelcomeOfferEligibility } from "@/lib/offers/welcome-code";

type EligibilityState = {
  /** Null while unknown, so callers can wait instead of guessing. */
  eligible: boolean | null;
  code: string | null;
};

/**
 * Guests are always eligible (they sign up to claim). Signed-in shoppers are
 * checked against their order history so we never offer a code checkout rejects.
 */
export function useWelcomeOfferEligibility(enabled = true): EligibilityState {
  const { user } = useAuth();
  const [state, setState] = useState<EligibilityState>({
    eligible: null,
    code: null,
  });

  useEffect(() => {
    if (!enabled) return;

    if (!user) {
      setState({ eligible: true, code: null });
      return;
    }

    let active = true;
    setState({ eligible: null, code: null });

    const load = async () => {
      try {
        const res = await fetchWithTimeout("/api/storefront/welcome-offer", {
          cache: "no-store",
        });
        if (!active) return;
        if (!res.ok) {
          setState({ eligible: false, code: null });
          return;
        }
        const payload = (await res.json()) as WelcomeOfferEligibility;
        if (!active) return;
        setState({ eligible: Boolean(payload.eligible), code: payload.code });
      } catch {
        if (active) setState({ eligible: false, code: null });
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [enabled, user]);

  return state;
}
