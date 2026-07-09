"use client";

import { ErrorPageShell } from "@/components/errors/ErrorPageShell";
import { publicErrorMessage } from "@/lib/api/public-error";
import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin]", error.digest, error);
  }, [error]);

  return (
    <ErrorPageShell
      title="Admin could not load"
      description={publicErrorMessage(
        error,
        "Something went wrong loading the admin panel. Try again or sign in again.",
      )}
      onRetry={() => reset()}
      primaryHref="/sign-in"
      primaryLabel="Sign in"
      secondaryHref="/"
      secondaryLabel="Store home"
    />
  );
}
