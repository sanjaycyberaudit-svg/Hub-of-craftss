"use client";

import Image from "next/image";
import { BadgeCheck, Quote, Star } from "lucide-react";
import { DocumentType } from "@/gql";
import { TestimonialCardFragment } from "@/features/testimonials";
import { TestimonialVideoPlayer } from "@/features/testimonials/components/TestimonialVideoPlayer";
import { keytoUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { HomeSectionHeader } from "./HomeSectionHeader";
import { HomeScrollSnapStrip, ScrollSnapItem } from "./HomeScrollSnapStrip";
import {
  MotionHoverLift,
  MotionRevealItem,
  MotionSection,
} from "./MotionSection";

type TestimonialNode = DocumentType<typeof TestimonialCardFragment>;

type Props = {
  testimonials: { node: TestimonialNode }[];
};

const scrollSnapTestimonialItemClass =
  "w-[88vw] max-w-[320px] shrink-0 grow-0 sm:w-auto sm:max-w-none sm:basis-[62%] md:basis-[46%] lg:basis-[34%] xl:basis-[30%]";

const scrollSnapTestimonialVideoItemClass =
  "w-[48vw] max-w-[160px] shrink-0 grow-0 sm:w-auto sm:max-w-none sm:basis-[38%] md:basis-[28%] lg:basis-[22%]";

function StarRating({ rating }: { rating: number }) {
  return (
    <div
      className="inline-flex items-center gap-0.5"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5 sm:h-4 sm:w-4",
            i < rating
              ? "fill-[#C5A059] text-[#C5A059]"
              : "fill-transparent text-primary/20",
          )}
        />
      ))}
    </div>
  );
}

function CustomerAvatar({
  name,
  imageKey,
  imageAlt,
}: {
  name: string;
  imageKey?: string | null;
  imageAlt?: string | null;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (imageKey) {
    return (
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full ring-2 ring-primary/15 ring-offset-2 ring-offset-background">
        <Image
          src={keytoUrl(imageKey)}
          alt={imageAlt || name}
          fill
          sizes="44px"
          className="object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#55104A] text-sm font-bold text-white ring-2 ring-primary/15 ring-offset-2 ring-offset-background">
      {initials || "ST"}
    </div>
  );
}

function ModernTextTestimonialCard({ node }: { node: TestimonialNode }) {
  const imageKey = node.featuredImage?.key;

  return (
    <article className="flex w-full flex-col rounded-2xl border border-primary/12 bg-card p-4 shadow-[0_16px_40px_-28px_rgba(107,24,88,0.45)] sm:min-h-[280px] sm:p-6">
      <div className="mb-3 flex items-start justify-between gap-2 sm:mb-4 sm:gap-3">
        <StarRating rating={node.rating ?? 5} />
        <Quote
          className="h-6 w-6 shrink-0 text-primary/15 sm:h-8 sm:w-8"
          aria-hidden
        />
      </div>

      {node.quote ? (
        <blockquote className="line-clamp-5 flex-1 font-[family-name:var(--font-hero-serif)] text-sm leading-relaxed text-foreground/90 sm:line-clamp-none sm:text-lg">
          “{node.quote}”
        </blockquote>
      ) : (
        <p className="flex-1 text-sm text-muted-foreground">
          Thank you for shopping with SRI SAI RAGHAVENDRA TEX.
        </p>
      )}

      <footer className="mt-4 flex items-center gap-2.5 border-t border-primary/10 pt-3 sm:mt-5 sm:gap-3 sm:pt-4">
        <CustomerAvatar
          name={node.customer_name}
          imageKey={imageKey}
          imageAlt={node.featuredImage?.alt}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground sm:text-base">
            {node.customer_name}
          </p>
          <p className="mt-0.5 flex items-start gap-1 text-[11px] leading-snug text-muted-foreground sm:text-xs">
            <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="line-clamp-2">
              {node.location
                ? `Verified buyer · ${node.location}`
                : "Verified buyer"}
            </span>
          </p>
        </div>
      </footer>
    </article>
  );
}

function ModernVideoTestimonialCard({ node }: { node: TestimonialNode }) {
  const imageKey = node.featuredImage?.key;
  const posterUrl = imageKey ? keytoUrl(imageKey) : null;

  return (
    <article className="group flex w-full flex-col overflow-hidden rounded-2xl border border-primary/15 bg-[#4A1048]/5 shadow-[0_16px_40px_-24px_rgba(107,24,88,0.5)]">
      <div className="relative aspect-[9/13] w-full max-h-[min(62vh,360px)] bg-muted sm:aspect-[3/4] sm:max-h-none">
        <TestimonialVideoPlayer
          fill
          showTapHint
          videoUrl={node.video_url ?? ""}
          posterUrl={posterUrl}
          customerName={node.customer_name}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#4A1048]/95 via-[#4A1048]/50 to-transparent p-3 pt-12 sm:p-4 sm:pt-16">
          <StarRating rating={node.rating ?? 5} />
          {node.quote ? (
            <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug text-white sm:mt-2 sm:text-sm">
              “{node.quote}”
            </p>
          ) : null}
          <p className="mt-1.5 text-sm font-bold leading-tight text-white sm:mt-2 sm:text-base">
            {node.customer_name}
          </p>
          {node.location ? (
            <p className="mt-0.5 line-clamp-1 text-[10px] text-white/80 sm:text-xs">
              {node.location}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function HomeTestimonialsCarousel({ testimonials }: Props) {
  if (!testimonials.length) return null;

  return (
    <MotionSection className="w-full min-w-0 py-4 sm:py-8 md:py-10">
      <HomeSectionHeader
        title="Customer"
        titleAccent="Testimonials"
        showViewMore={false}
      />
      <HomeScrollSnapStrip ariaLabel="Customer testimonials from admin">
        {testimonials.map(({ node }, index) => {
          const isVideo =
            node.kind === "video" && Boolean(node.video_url?.trim());

          return (
            <ScrollSnapItem
              key={node.id}
              className={
                isVideo
                  ? scrollSnapTestimonialVideoItemClass
                  : scrollSnapTestimonialItemClass
              }
            >
              <MotionRevealItem index={index} instant className="w-full">
                <MotionHoverLift className="w-full">
                  {isVideo ? (
                    <ModernVideoTestimonialCard node={node} />
                  ) : (
                    <ModernTextTestimonialCard node={node} />
                  )}
                </MotionHoverLift>
              </MotionRevealItem>
            </ScrollSnapItem>
          );
        })}
      </HomeScrollSnapStrip>
    </MotionSection>
  );
}
