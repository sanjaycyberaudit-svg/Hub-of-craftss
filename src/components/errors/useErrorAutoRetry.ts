"use client";

import { useEffect, useState } from "react";

const RETRY_DELAY_MS = 900;
/** Allow another automatic retry on the same route only after this window. */
const RETRY_COOLDOWN_MS = 60_000;

function retryKey() {
  return `hoc:error-retry:${window.location.pathname}`;
}

function shouldAutoRetry(): boolean {
  try {
    const previous = Number(window.sessionStorage.getItem(retryKey()) ?? 0);
    if (
      Number.isFinite(previous) &&
      Date.now() - previous < RETRY_COOLDOWN_MS
    ) {
      return false;
    }
    window.sessionStorage.setItem(retryKey(), String(Date.now()));
    return true;
  } catch {
    // Private mode / storage disabled: retry once per mount rather than loop.
    return false;
  }
}

/**
 * Recovers from one-off render failures automatically. Most storefront errors
 * are transient (cold connection, upstream blip), so we re-render the segment
 * once before showing an error page. The cooldown prevents a reload loop when
 * the failure is persistent.
 */
export function useErrorAutoRetry(error: unknown, reset: () => void): boolean {
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (!shouldAutoRetry()) return;

    setIsRetrying(true);
    const timer = window.setTimeout(() => reset(), RETRY_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      setIsRetrying(false);
    };
  }, [error, reset]);

  return isRetrying;
}
