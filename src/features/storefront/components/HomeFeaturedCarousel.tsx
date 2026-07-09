"use client";

import Image from "next/image";
import { Suspense } from "react";
import { DocumentType, gql } from "@/gql";
import { ProductCardSkeleton } from "@/features/products";
import {
  ProductDiscountBadge,
  ProductPriceDisplay,
} from "@/features/products/components/ProductPriceDisplay";
import { AddToCartButton } from "@/features/carts";
import { AddToWishListButton } from "@/features/wishlists";
import { ViewTransitionLink } from "@/components/ui/ViewTransitionLink";
import { Badge } from "@/components/ui/badge";
import { keytoUrl } from "@/lib/utils";
import {
  productImageTransitionName,
  viewTransitionStyle,
} from "@/lib/view-transitions";
import { HomeSectionHeader } from "./HomeSectionHeader";
import {
  HomeScrollSnapStrip,
  ScrollSnapItem,
  scrollSnapFeaturedItemClass,
} from "./HomeScrollSnapStrip";
import {
  MotionHoverLift,
  MotionRevealItem,
  MotionSection,
} from "./MotionSection";

export const HomeFeaturedProductFragment = gql(/* GraphQL */ `
  fragment HomeFeaturedProductFragment on products {
    id
    name
    slug
    badge
    price
    discountEnabled: discount_enabled
    discountPercent: discount_percent
    featuredImage: medias {
      id
      key
      alt
    }
  }
`);

type ProductNode = DocumentType<typeof HomeFeaturedProductFragment>;

type Props = {
  products: { node: ProductNode }[];
};

function FeaturedSlide({ product }: { product: ProductNode }) {
  const { id, name, slug, featuredImage, badge } = product;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-primary/12 bg-card shadow-[0_14px_36px_-22px_rgba(107,24,88,0.55)]">
      <div className="relative w-full aspect-[3/4] max-h-[min(72vh,440px)] bg-muted">
        <ViewTransitionLink href={`/shop/${slug}`} className="absolute inset-0">
          <Image
            src={keytoUrl(featuredImage?.key)}
            alt={featuredImage?.alt || name}
            fill
            sizes="(max-width: 640px) 78vw, (max-width: 1024px) 42vw, 360px"
            className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
            style={viewTransitionStyle(productImageTransitionName(id))}
            loading="lazy"
          />
        </ViewTransitionLink>
        <ProductDiscountBadge
          product={product}
          className="absolute top-3 left-3 z-10"
        />
        {badge ? (
          <Badge
            className="absolute top-3 right-3 z-10"
            variant={badge as "default"}
          >
            {badge}
          </Badge>
        ) : null}
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary/15 bg-white/95 px-3 py-1.5 shadow-md backdrop-blur-sm">
          <Suspense fallback={<span className="inline-block h-9 w-9" />}>
            <AddToWishListButton productId={id} />
          </Suspense>
          <Suspense fallback={<span className="inline-block h-9 w-9" />}>
            <AddToCartButton productId={id} />
          </Suspense>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-center p-3 sm:p-4">
        <ViewTransitionLink href={`/shop/${slug}`}>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base hover:text-primary">
            {name}
          </h3>
        </ViewTransitionLink>
        <ProductPriceDisplay product={product} className="mt-1" />
      </div>
    </article>
  );
}

export function HomeFeaturedCarousel({ products }: Props) {
  if (!products.length) return null;

  return (
    <MotionSection className="w-full min-w-0 py-4 sm:py-8 md:py-10">
      <HomeSectionHeader
        title="Featured"
        titleAccent="Products"
        href="/featured"
      />
      <HomeScrollSnapStrip ariaLabel="Featured products">
        {products.map(({ node }, index) => (
          <ScrollSnapItem key={node.id} className={scrollSnapFeaturedItemClass}>
            <MotionRevealItem index={index} className="group h-full">
              <MotionHoverLift className="h-full">
                <FeaturedSlide product={node} />
              </MotionHoverLift>
            </MotionRevealItem>
          </ScrollSnapItem>
        ))}
      </HomeScrollSnapStrip>
    </MotionSection>
  );
}

export function HomeFeaturedCarouselSkeleton() {
  return (
    <section className="py-6">
      <div className="mb-4 h-8 w-48 animate-pulse rounded bg-muted" />
      <ProductCardSkeleton />
    </section>
  );
}
