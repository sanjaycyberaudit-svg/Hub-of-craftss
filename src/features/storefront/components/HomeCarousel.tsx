"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { ReactNode, useCallback, useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { useCarouselAutoAdvance } from "@/features/storefront/hooks/useCarouselAutoAdvance";
import { CarouselSlideProgress } from "./CarouselSlideProgress";

type Props = {
  children: ReactNode;
  loop?: boolean;
  className?: string;
  delayMs?: number;
  showArrows?: boolean;
  showProgress?: boolean;
};

const arrowClass =
  "absolute top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full border-2 border-primary/20 bg-white/95 text-primary shadow-md transition-all duration-300 ease-out hover:bg-white hover:border-primary/50 disabled:pointer-events-none disabled:!opacity-0 sm:h-11 sm:w-11";

const arrowRevealClass =
  "pointer-events-none scale-90 opacity-0 group-hover/carousel:pointer-events-auto group-hover/carousel:scale-100 group-hover/carousel:opacity-100 group-focus-within/carousel:pointer-events-auto group-focus-within/carousel:scale-100 group-focus-within/carousel:opacity-100 focus-visible:pointer-events-auto focus-visible:scale-100 focus-visible:opacity-100";

export function HomeCarousel({
  children,
  loop = true,
  className,
  delayMs = 5000,
  showArrows = true,
  showProgress = true,
}: Props) {
  const [api, setApi] = useState<CarouselApi>();
  const [active, setActive] = useState(0);
  const [slideCount, setSlideCount] = useState(0);
  const [progress, setProgress] = useState(0);

  const { isActive: autoplayActive, hoverHandlers } = useCarouselAutoAdvance(
    api,
    {
      delayMs,
      enabled: loop,
    },
  );

  const onSelect = useCallback(() => {
    if (!api) return;
    setActive(api.selectedScrollSnap());
    setSlideCount(api.scrollSnapList().length);
    setProgress(0);
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, onSelect]);

  useEffect(() => {
    if (!autoplayActive || slideCount <= 1) return;
    const step = 100 / (delayMs / 100);
    const interval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : p + step));
    }, 100);
    return () => clearInterval(interval);
  }, [active, autoplayActive, delayMs, slideCount]);

  return (
    <div
      className={cn("group/carousel w-full min-w-0", className)}
      {...hoverHandlers}
    >
      <div className="relative w-full overflow-hidden rounded-2xl">
        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop, containScroll: "trimSnaps" }}
          className="w-full max-w-full"
        >
          <CarouselContent className="-ml-3 sm:-ml-4">
            {children}
          </CarouselContent>
          {showArrows ? (
            <>
              <CarouselPrevious
                className={cn(arrowClass, arrowRevealClass, "left-1 sm:left-2")}
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
              </CarouselPrevious>
              <CarouselNext
                className={cn(
                  arrowClass,
                  arrowRevealClass,
                  "right-1 sm:right-2",
                )}
                aria-label="Next slide"
              >
                <ChevronRight className="h-6 w-6" strokeWidth={2.5} />
              </CarouselNext>
            </>
          ) : null}
        </Carousel>
      </div>
      {showProgress ? (
        <CarouselSlideProgress
          count={slideCount}
          active={active}
          progress={progress}
        />
      ) : null}
    </div>
  );
}

export const homeCarouselItemClass =
  "pl-3 sm:pl-4 min-w-0 shrink-0 grow-0 basis-[92%] sm:basis-[78%] md:basis-[48%] lg:basis-[36%]";

export const homeFeaturedItemClass =
  "pl-3 sm:pl-4 min-w-0 shrink-0 grow-0 basis-[92%] sm:basis-[85%] md:basis-[55%] lg:basis-[42%]";
