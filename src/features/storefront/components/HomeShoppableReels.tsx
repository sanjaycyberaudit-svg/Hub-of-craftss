"use client";

import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { DocumentType } from "@/gql";
import { ViewTransitionLink } from "@/components/ui/ViewTransitionLink";
import { HomeFeaturedProductFragment } from "./HomeFeaturedCarousel";
import { HomeSectionHeader } from "./HomeSectionHeader";
import {
  HomeScrollSnapStrip,
  ScrollSnapItem,
  scrollSnapReelItemClass,
} from "./HomeScrollSnapStrip";
import { MotionRevealItem, MotionSection } from "./MotionSection";
import { ProductPriceDisplay } from "@/features/products/components/ProductPriceDisplay";
import {
  productImageTransitionName,
  viewTransitionStyle,
} from "@/lib/view-transitions";
import { keytoUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

type ProductNode = DocumentType<typeof HomeFeaturedProductFragment>;

type Props = {
  products: { node: ProductNode }[];
};

function ReelProductCard({ product }: { product: ProductNode }) {
  const { id, name, slug, featuredImage } = product;
  if (!featuredImage?.key) return null;

  return (
    <ViewTransitionLink href={`/shop/${slug}`} className="group block w-full">
      <article className="relative aspect-[9/16] w-full min-h-[220px] overflow-hidden rounded-2xl border border-primary/20 bg-muted shadow-[0_16px_40px_-20px_rgba(107,24,88,0.55)]">
        <Image
          src={keytoUrl(featuredImage.key)}
          alt={featuredImage.alt || name}
          fill
          sizes="(max-width: 640px) 45vw, 220px"
          className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.05]"
          style={viewTransitionStyle(productImageTransitionName(id))}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 z-[2] p-3 pt-12">
          <p className="line-clamp-2 text-sm font-bold leading-snug text-white">
            {name}
          </p>
          <ProductPriceDisplay
            product={product}
            className="mt-1 text-white [&_span]:text-white [&_s]:text-white/70"
          />
          <span
            className={cn(
              "mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-white",
              "transition-transform duration-300 group-hover:scale-[1.03]",
            )}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Shop now
          </span>
        </div>
      </article>
    </ViewTransitionLink>
  );
}

/** Featured product clips — separate from admin testimonials. */
export function HomeShoppableReels({ products }: Props) {
  const items = products
    .map(({ node }) => node)
    .filter((node) => node.featuredImage?.key)
    .slice(0, 16);

  if (!items.length) return null;

  return (
    <MotionSection className="w-full min-w-0 py-4 sm:py-8 md:py-10">
      <HomeSectionHeader
        title="Watch &"
        titleAccent="Shop"
        href="/featured"
        viewMoreLabel="Shop featured"
      />
      <HomeScrollSnapStrip ariaLabel="Watch and shop featured sarees">
        {items.map((product, index) => (
          <ScrollSnapItem key={product.id} className={scrollSnapReelItemClass}>
            <MotionRevealItem index={index} instant className="w-full">
              <ReelProductCard product={product} />
            </MotionRevealItem>
          </ScrollSnapItem>
        ))}
      </HomeScrollSnapStrip>
    </MotionSection>
  );
}
