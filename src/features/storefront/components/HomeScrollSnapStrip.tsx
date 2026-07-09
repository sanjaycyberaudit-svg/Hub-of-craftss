"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StripProps = {
  children: ReactNode;
  className?: string;
  trackClassName?: string;
  ariaLabel?: string;
};

type ItemProps = {
  children: ReactNode;
  className?: string;
};

export function HomeScrollSnapStrip({
  children,
  className,
  trackClassName,
  ariaLabel,
}: StripProps) {
  return (
    <div
      className={cn("scroll-snap-strip -mx-4 px-4 sm:mx-0 sm:px-0", className)}
    >
      <div
        className={cn("scroll-snap-strip__track", trackClassName)}
        role="list"
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </div>
  );
}

export function ScrollSnapItem({ children, className }: ItemProps) {
  return (
    <div role="listitem" className={cn("scroll-snap-item", className)}>
      {children}
    </div>
  );
}

export const scrollSnapCategoryItemClass =
  "w-[86vw] max-w-[360px] shrink-0 grow-0 sm:w-auto sm:max-w-none sm:basis-[62%] md:basis-[44%] lg:basis-[34%] xl:basis-[30%]";

export const scrollSnapFeaturedItemClass =
  "w-[80vw] max-w-[320px] shrink-0 grow-0 sm:w-auto sm:max-w-none sm:basis-[58%] md:basis-[42%] lg:basis-[32%] xl:basis-[28%]";

export const scrollSnapReelItemClass =
  "w-[44vw] max-w-[180px] shrink-0 grow-0 sm:w-auto sm:max-w-none sm:basis-[34%] md:basis-[26%] lg:basis-[20%]";

export const scrollSnapPriceItemClass =
  "w-[46vw] max-w-[200px] shrink-0 grow-0 sm:w-auto sm:max-w-none sm:basis-[42%] md:basis-[30%] lg:basis-[24%] xl:basis-[20%]";
