import Link from "next/link";
import { gql, DocumentType } from "@/gql";

import { Skeleton } from "@/components/ui/skeleton";
import { keytoUrl } from "@/lib/utils";
import { CollectionCardSurface } from "./CollectionCardSurface";

export const CollectionCardFragment = gql(/* GraphQL */ `
  fragment CollectionCardFragment on collections {
    id
    label
    slug
    featuredImage: medias {
      key
      alt
    }
  }
`);

function CollectionsCard({
  collection,
}: {
  collection: DocumentType<typeof CollectionCardFragment>;
}) {
  const { slug, label, featuredImage } = collection;

  return (
    <Link
      href={`/collections/${slug}`}
      className="group block overflow-hidden rounded-2xl border border-primary/15 bg-muted/30 shadow-sm transition-shadow hover:shadow-md active:scale-[0.99]"
    >
      <CollectionCardSurface
        label={label}
        imageSrc={keytoUrl(featuredImage?.key)}
        imageAlt={featuredImage?.alt || label}
        sizes="(max-width: 640px) 48vw, (max-width: 1024px) 31vw, 260px"
      />
    </Link>
  );
}

export default CollectionsCard;

export const CollectionsCardSkeleton = () => (
  <Skeleton className="aspect-[4/5] w-full rounded-2xl sm:aspect-[5/4] lg:aspect-[16/10]" />
);
