"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Props = {
  title?: string;
  description?: string;
};

/**
 * Inline replacement for a section whose data could not be loaded. Keeps the
 * rest of the page usable instead of escalating to the route error boundary.
 */
export function SectionErrorNotice({
  title = "We could not load this section",
  description = "This is usually temporary. Please try again in a moment.",
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      role="status"
      className="my-6 flex flex-col items-center gap-3 rounded-2xl border border-brand-gold/30 bg-card/80 px-6 py-10 text-center"
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-md text-xs text-muted-foreground">{description}</p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => startTransition(() => router.refresh())}
      >
        {isPending ? "Retrying…" : "Try again"}
      </Button>
    </div>
  );
}
