"use client";

import { ErrorPageShell } from "@/components/errors/ErrorPageShell";
import { publicErrorMessage } from "@/lib/api/public-error";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Page-scoped boundary so an orders crash does not take over the whole admin
 * shell with the generic "Admin could not load" screen.
 */
export default function AdminOrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin/orders]", error.digest, error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorPageShell
      title="Orders could not load"
      description={
        publicErrorMessage(
          error,
          "Could not load orders. Try again — your other admin pages should still work.",
        ) + (error.digest ? ` (${error.digest})` : "")
      }
      onRetry={() => reset()}
      primaryHref="/admin/orders"
      primaryLabel="Reload orders"
      secondaryHref="/admin"
      secondaryLabel="Admin home"
    />
  );
}
