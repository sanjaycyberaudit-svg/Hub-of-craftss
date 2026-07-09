"use client";

import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "./icons";
import SearchInput from "./SearchInput";
import { useMobileSearch } from "./MobileSearchContext";

export function MobileSearchTrigger({
  className,
  "aria-label": ariaLabel = "Search products",
}: {
  className?: string;
  "aria-label"?: string;
}) {
  const { openSearch } = useMobileSearch();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label={ariaLabel}
      onClick={openSearch}
    >
      <Icons.search className="h-5 w-5" />
    </Button>
  );
}

function SearchFieldFallback() {
  return <Skeleton className="h-11 w-full rounded-full" />;
}

export function MobileSearchOverlay() {
  const { isOpen, closeSearch } = useMobileSearch();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[250] flex flex-col bg-background md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Search products"
    >
      <div
        className="flex items-center gap-2 border-b px-2 pb-2"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top, 0px))" }}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 touch-manipulation"
          aria-label="Close search"
          onClick={closeSearch}
        >
          <Icons.chevronLeft className="h-5 w-5" />
        </Button>

        <Suspense fallback={<SearchFieldFallback />}>
          <SearchInput
            variant="compact"
            autoFocus
            onSearchSubmit={closeSearch}
            className="min-w-0 flex-1"
          />
        </Suspense>
      </div>
    </div>
  );
}
