"use client";

import { DocumentType } from "@/gql";
import { CollectionCardFragment } from "@/features/collections";
import { CollectionCardSurface } from "@/features/collections/components/CollectionCardSurface";
import { ViewTransitionLink } from "@/components/ui/ViewTransitionLink";
import { keytoUrl } from "@/lib/utils";
import { collectionImageTransitionName } from "@/lib/view-transitions";
import { HomeSectionHeader } from "./HomeSectionHeader";
import {
  MotionHoverLift,
  MotionRevealItem,
  MotionSection,
} from "./MotionSection";

type CollectionNode = DocumentType<typeof CollectionCardFragment>;

type Props = {
  collections: { node: CollectionNode }[];
};

/** Full category grid on the homepage — no carousel / View More gate. */
export function HomeCategoriesCarousel({ collections }: Props) {
  if (!collections.length) return null;

  return (
    <MotionSection className="w-full min-w-0 py-4 sm:py-8 md:py-10">
      <HomeSectionHeader
        title="Product"
        titleAccent="Categories"
        href="/collections"
        showViewMore={false}
      />
      <section
        aria-label="Product categories"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-6"
      >
        {collections.map(({ node }, index) => (
          <MotionRevealItem
            key={node.id}
            index={index}
            instant
            className="w-full"
          >
            <MotionHoverLift className="w-full">
              <ViewTransitionLink
                href={`/collections/${node.slug}`}
                className="group block w-full overflow-hidden rounded-[1.25rem] border border-brand-teal/20 bg-muted/30 shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-brand-magenta/40 hover:shadow-[0_18px_40px_-18px_rgba(192,48,120,0.35)]"
              >
                <CollectionCardSurface
                  label={node.label}
                  imageSrc={keytoUrl(node.featuredImage.key)}
                  imageAlt={node.featuredImage.alt || node.label}
                  aspectClass="aspect-[5/3] sm:aspect-[16/10]"
                  sizes="(max-width: 640px) 48vw, (max-width: 1024px) 31vw, 260px"
                  viewTransitionName={collectionImageTransitionName(node.id)}
                />
              </ViewTransitionLink>
            </MotionHoverLift>
          </MotionRevealItem>
        ))}
      </section>
    </MotionSection>
  );
}
