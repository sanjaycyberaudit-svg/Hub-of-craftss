"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import {
  defaultPosterForEmbed,
  embedIframeSrc,
  parseVideoEmbed,
} from "../lib/video";

type Props = {
  videoUrl: string;
  posterUrl?: string | null;
  customerName: string;
  className?: string;
  /** Fill parent (used inside testimonial cards with fixed aspect) */
  fill?: boolean;
  showTapHint?: boolean;
};

export function TestimonialVideoPlayer({
  videoUrl,
  posterUrl,
  customerName,
  className,
  fill = false,
  showTapHint = true,
}: Props) {
  const [active, setActive] = useState(false);
  const embed = parseVideoEmbed(videoUrl);
  const poster =
    posterUrl || (embed ? defaultPosterForEmbed(embed) : null) || undefined;
  const externalPoster =
    !!poster &&
    (poster.includes("img.youtube.com") || poster.includes("vumbnail.com"));

  const onPlay = useCallback(() => setActive(true), []);

  const boxClass = fill
    ? "absolute inset-0 h-full w-full"
    : "relative aspect-[5/3] w-full sm:aspect-[16/10]";

  if (!embed) {
    return (
      <div
        className={cn(
          boxClass,
          "flex items-center justify-center bg-primary p-4 text-center text-sm text-white",
          className,
        )}
      >
        Video link could not be loaded.
      </div>
    );
  }

  if (active) {
    return (
      <div className={cn(boxClass, "bg-black", className)}>
        {embed.provider === "direct" ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={embed.src}
            controls
            playsInline
            preload="metadata"
            autoPlay
          />
        ) : (
          <iframe
            title={`Video review from ${customerName}`}
            src={embedIframeSrc(embed)}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onPlay}
      className={cn(
        boxClass,
        "group overflow-hidden bg-[#55104A] text-left",
        className,
      )}
      aria-label={`Play video review from ${customerName}`}
    >
      {poster ? (
        <Image
          src={poster}
          alt=""
          fill
          unoptimized={externalPoster}
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 78vw, 400px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary via-[#C9A227] to-[#55104A]"
          aria-hidden
        />
      )}
      <div className="absolute inset-0 bg-black/30" />
      <span className="absolute left-1/2 top-1/2 z-[1] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/90 bg-primary/90 text-white shadow-lg sm:h-12 sm:w-12">
          <Play className="ml-0.5 h-5 w-5 fill-current" />
        </span>
      </span>
      {showTapHint ? (
        <span className="absolute bottom-2 right-2 z-[1] rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
          Tap to play
        </span>
      ) : null}
    </button>
  );
}
