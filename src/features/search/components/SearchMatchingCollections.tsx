"use client";

import Link from "next/link";
import type { StorefrontCollectionMatch } from "@/lib/storefront/search-utils";

type SearchMatchingCollectionsProps = {
  collections: StorefrontCollectionMatch[];
  heading?: string;
};

export function SearchMatchingCollections({
  collections,
  heading = "Collections",
}: SearchMatchingCollectionsProps) {
  if (collections.length === 0) return null;

  return (
    <nav aria-label="Matching collections" className="min-w-0 max-w-full pt-1">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {heading}
        </span>
        {collections.map((collection) => (
          <Link
            key={collection.id}
            href={`/collections/${collection.slug}`}
            className="shrink-0 whitespace-nowrap rounded-full border border-primary/20 bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-muted active:scale-[0.98]"
          >
            {collection.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
