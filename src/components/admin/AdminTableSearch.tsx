"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type AdminTableSearchConfig = {
  entityLabel: string;
  placeholder: string;
  emptyResultHint?: string;
};

type AdminTableSearchProps = {
  appliedQuery: string;
  draftQuery: string;
  onDraftQueryChange: (value: string) => void;
  onApplySearch: (value?: string) => void;
  onClearSearch: () => void;
  filteredCount: number;
  totalCount: number;
  layout?: "default" | "compact";
  toolbarEnd?: React.ReactNode;
  hasActiveFilters?: boolean;
  onClearAllFilters?: () => void;
  filterSummary?: string | null;
} & AdminTableSearchConfig;

export function AdminTableSearch({
  entityLabel,
  placeholder,
  emptyResultHint,
  appliedQuery,
  draftQuery,
  onDraftQueryChange,
  onApplySearch,
  onClearSearch,
  filteredCount,
  totalCount,
  layout = "default",
  toolbarEnd,
  hasActiveFilters,
  onClearAllFilters,
  filterSummary,
}: AdminTableSearchProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isFiltering = appliedQuery.trim().length > 0;
  const hasDraftChanges = draftQuery.trim() !== appliedQuery.trim();
  const isPending = hasDraftChanges && draftQuery.trim().length > 0;

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (appliedQuery || draftQuery)) {
        event.preventDefault();
        onClearSearch();
        inputRef.current?.blur();
      }

      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [appliedQuery, draftQuery, onClearSearch]);

  const statusBadge = isPending ? (
    <Badge variant="outline" className="border-amber-300 text-amber-800">
      Ready to search
    </Badge>
  ) : isFiltering ? (
    <Badge className="bg-primary text-primary-foreground">Search active</Badge>
  ) : (
    <Badge variant="secondary">Showing all {entityLabel}</Badge>
  );

  const showClearAll =
    layout === "compact" && hasActiveFilters && onClearAllFilters;

  const hasCompactStatus =
    isFiltering ||
    Boolean(filterSummary) ||
    isPending ||
    ((isFiltering || Boolean(filterSummary)) && filteredCount === 0);

  const hasDefaultStatus =
    isFiltering || isPending || (isFiltering && filteredCount === 0);

  const searchInput = (
    <div className="relative min-w-[12rem] flex-1 sm:max-w-xl">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
        value={draftQuery}
        onChange={(event) => onDraftQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onApplySearch(event.currentTarget.value);
          }
        }}
        placeholder={placeholder}
        className={`h-10 pl-8 ${isPending ? "border-amber-400 ring-1 ring-amber-200" : ""}`}
        aria-label={placeholder}
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );

  const searchActions = (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="button"
        className="h-10 min-w-[110px]"
        onClick={() => onApplySearch()}
      >
        <Search className="mr-2 h-4 w-4" aria-hidden />
        Search
      </Button>
      {(appliedQuery || draftQuery) && (
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={onClearSearch}
        >
          Clear
          <X className="ml-2 h-4 w-4" aria-hidden />
        </Button>
      )}
    </div>
  );

  if (layout === "compact") {
    return (
      <section
        className="rounded-lg border bg-muted/20 p-4"
        aria-label={`Search and filter ${entityLabel}`}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          {searchInput}
          {searchActions}
          {toolbarEnd}
          {showClearAll ? (
            <Button
              type="button"
              variant="ghost"
              className="h-10 shrink-0 text-muted-foreground"
              onClick={onClearAllFilters}
            >
              Clear filters
            </Button>
          ) : null}
        </div>

        {hasCompactStatus ? (
          <div className="mt-3 space-y-1 text-sm" aria-live="polite">
            {isFiltering || filterSummary ? (
              <p className="font-medium">
                {filteredCount} of {totalCount} {entityLabel}
                {isFiltering ? <> matching &quot;{appliedQuery}&quot;</> : null}
                {filterSummary ? <> · {filterSummary}</> : null}
              </p>
            ) : null}

            {isPending ? (
              <p className="text-amber-700">
                Press Enter or Search for &quot;{draftQuery.trim()}&quot;
              </p>
            ) : null}

            {(isFiltering || filterSummary) && filteredCount === 0 ? (
              <p className="text-destructive">
                No {entityLabel} match the current filters
                {emptyResultHint ? ` — ${emptyResultHint}` : ""}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border bg-muted/20 p-4"
      aria-label={`Search ${entityLabel}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold capitalize">
          Search {entityLabel}
        </h3>
        {statusBadge}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {searchInput}
        {searchActions}
      </div>

      {hasDefaultStatus ? (
        <div className="mt-3 space-y-1 text-sm" aria-live="polite">
          {isFiltering ? (
            <p className="font-medium">
              Results: {filteredCount} of {totalCount} {entityLabel} match
              &quot;
              {appliedQuery}&quot;
            </p>
          ) : null}

          {isPending ? (
            <p className="text-amber-700">
              Click Search or press Enter to find &quot;{draftQuery.trim()}
              &quot;
            </p>
          ) : null}

          {isFiltering && filteredCount === 0 ? (
            <p className="text-destructive">
              No {entityLabel} found for &quot;{appliedQuery}&quot;
              {emptyResultHint ? ` — ${emptyResultHint}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
