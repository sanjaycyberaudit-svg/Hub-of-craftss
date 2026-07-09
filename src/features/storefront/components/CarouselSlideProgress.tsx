"use client";

import { cn } from "@/lib/utils";

type Props = {
  count: number;
  active: number;
  progress: number;
  className?: string;
};

/** Progress segments below auto-advancing carousels. */
export function CarouselSlideProgress({
  count,
  active,
  progress,
  className,
}: Props) {
  if (count <= 1) return null;

  return (
    <div
      className={cn("mt-3 w-full px-1 sm:mt-4", className)}
      role="status"
      aria-live="polite"
      aria-label={`Slide ${active + 1} of ${count}`}
    >
      <div className="flex h-1 gap-1 overflow-hidden rounded-full bg-primary/12">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="h-full min-w-0 flex-1 overflow-hidden rounded-full bg-primary/10"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-100 ease-linear"
              style={{
                width:
                  index < active
                    ? "100%"
                    : index === active
                      ? `${progress}%`
                      : "0%",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
