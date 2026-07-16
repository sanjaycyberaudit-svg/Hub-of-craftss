"use client";

import {
  SheetClose,
} from "@/components/ui/sheet";
import { collectionMenuHref, type MenuCollection } from "@/lib/storefront/menu-collections";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const childLinkBase =
  "flex items-center rounded-lg py-2 pl-3 pr-2 text-sm transition-colors touch-manipulation";

type Props = {
  collections: MenuCollection[];
  pathname: string;
  onNavigate: (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => void;
};

function isCollectionPathActive(pathname: string, slug: string) {
  const href = collectionMenuHref(slug);
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SideMenuCollections({
  collections,
  pathname,
  onNavigate,
}: Props) {
  const onCollectionsSection =
    pathname === "/collections" || pathname.startsWith("/collections/");
  const [expanded, setExpanded] = useState(onCollectionsSection);

  useEffect(() => {
    if (onCollectionsSection) {
      setExpanded(true);
    }
  }, [onCollectionsSection]);

  if (!collections.length) {
    return (
      <SheetClose asChild>
        <Link
          href="/collections"
          prefetch
          onClick={onNavigate("/collections")}
          aria-current={pathname === "/collections" ? "page" : undefined}
          className={cn(
            childLinkBase,
            "mx-0 border-l-[3px] px-3 font-medium",
            pathname === "/collections"
              ? "border-primary bg-primary/12 font-semibold text-primary"
              : "border-transparent text-foreground hover:bg-primary/10",
          )}
        >
          Collections
        </Link>
      </SheetClose>
    );
  }

  const sectionActive = onCollectionsSection;

  return (
    <div className="rounded-lg">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors touch-manipulation",
          sectionActive
            ? "border-l-[3px] border-primary bg-primary/12 pl-[calc(0.75rem-3px)] text-primary"
            : "border-l-[3px] border-transparent text-foreground hover:bg-primary/10",
        )}
      >
        <span className="flex-1">Collections</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            expanded ? "rotate-180" : "",
          )}
          aria-hidden
        />
      </button>

      {expanded ? (
        <ul className="mt-0.5 space-y-0.5 border-l border-primary/15 pb-1 pl-3 ml-3">
          {collections.map((collection) => {
            const href = collectionMenuHref(collection.slug);
            const active = isCollectionPathActive(pathname, collection.slug);
            return (
              <li key={collection.id}>
                <SheetClose asChild>
                  <Link
                    href={href}
                    prefetch
                    onClick={onNavigate(href)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      childLinkBase,
                      active
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-foreground/90 hover:bg-primary/10 hover:text-foreground",
                    )}
                  >
                    <span className="line-clamp-2">{collection.label}</span>
                  </Link>
                </SheetClose>
              </li>
            );
          })}
          <li>
            <SheetClose asChild>
              <Link
                href="/collections"
                prefetch
                onClick={onNavigate("/collections")}
                aria-current={pathname === "/collections" ? "page" : undefined}
                className={cn(
                  childLinkBase,
                  "text-xs font-semibold uppercase tracking-wide text-primary/80 hover:text-primary",
                  pathname === "/collections" ? "text-primary" : "",
                )}
              >
                View all categories
              </Link>
            </SheetClose>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
