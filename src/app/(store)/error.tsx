"use client";

import { ErrorPageShell } from "@/components/errors/ErrorPageShell";
import { publicErrorMessage } from "@/lib/api/public-error";
import { useEffect } from "react";

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[store/error]", error.digest, error);
  }, [error]);

  return (
    <ErrorPageShell
      title="Something went wrong"
      description={publicErrorMessage(
        error,
        "We could not load the shop page. Please try again.",
      )}
      onRetry={() => reset()}
      primaryHref="/"
      primaryLabel="Back to home"
      secondaryHref="/shop"
      secondaryLabel="Browse shop"
    />
  );
}
