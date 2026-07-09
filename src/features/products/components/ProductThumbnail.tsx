import Image from "next/image";
import { cn, keytoUrl } from "@/lib/utils";
import {
  productThumbnailFrameClass,
  productThumbnailImageClass,
  productThumbnailSizes,
} from "@/features/products/productThumbnail";

type Props = {
  imageKey: string;
  alt: string;
  /** Extra classes on the outer frame (e.g. rounded corners). */
  frameClassName?: string;
  /** Extra classes on the image (e.g. hover effects). */
  imageClassName?: string;
  priority?: boolean;
};

/**
 * Portrait product thumbnail with top-aligned crop — safe for varied upload ratios.
 */
export function ProductThumbnail({
  imageKey,
  alt,
  frameClassName,
  imageClassName,
  priority = false,
}: Props) {
  return (
    <div className={cn(productThumbnailFrameClass, frameClassName)}>
      <Image
        src={keytoUrl(imageKey)}
        alt={alt}
        fill
        sizes={productThumbnailSizes}
        className={cn(productThumbnailImageClass, imageClassName)}
        priority={priority}
        loading={priority ? undefined : "lazy"}
      />
    </div>
  );
}
