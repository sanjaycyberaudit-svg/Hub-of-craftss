"use client";

import type { CarouselApi } from "@/components/ui/carousel";
import { useEffect, useState } from "react";

export type CarouselAutoAdvanceOptions = {
  delayMs: number;
  /** False when only one slide or rotation is disabled. */
  enabled: boolean;
  pauseOnHover?: boolean;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Reliable carousel auto-advance using Embla scroll API (not the autoplay plugin).
 * Pauses on hover/focus and during drag; resumes afterward.
 */
export function useCarouselAutoAdvance(
  api: CarouselApi | undefined,
  { delayMs, enabled, pauseOnHover = true }: CarouselAutoAdvanceOptions,
) {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [paused, setPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  const isActive = enabled && !reducedMotion;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!api) return;

    const onPointerDown = () => setUserPaused(true);
    const onPointerUp = () => setUserPaused(false);

    api.on("pointerDown", onPointerDown);
    api.on("pointerUp", onPointerUp);

    return () => {
      api.off("pointerDown", onPointerDown);
      api.off("pointerUp", onPointerUp);
    };
  }, [api]);

  useEffect(() => {
    if (!api || !isActive) return;
    if (paused || userPaused) return;

    const timer = window.setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
        return;
      }
      api.scrollTo(0);
    }, delayMs);

    return () => window.clearInterval(timer);
  }, [api, delayMs, isActive, paused, userPaused]);

  const hoverHandlers = pauseOnHover
    ? {
        onMouseEnter: () => setPaused(true),
        onMouseLeave: () => setPaused(false),
        onFocusCapture: () => setPaused(true),
        onBlurCapture: () => setPaused(false),
      }
    : {};

  return { isActive, hoverHandlers };
}
