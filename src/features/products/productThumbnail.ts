/**
 * Shared product grid thumbnail framing (portrait, top-aligned crop).
 * Keeps model faces visible for tall phone/camera uploads.
 */
export const PRODUCT_THUMB_ASPECT_CLASS = "aspect-[3/4]";

/** Frame around the image (fixed ratio, clips overflow). */
export const productThumbnailFrameClass = `relative w-full overflow-hidden bg-muted ${PRODUCT_THUMB_ASPECT_CLASS}`;

/** Image fit inside the frame — cover + anchor to top center. */
export const productThumbnailImageClass =
  "object-cover object-top transition-all duration-500";

/** Hover state used on product cards. */
export const productThumbnailImageHoverClass = `${productThumbnailImageClass} hover:scale-[1.02] hover:opacity-90`;

/** ~360–400px served width on 2-col mobile grids (incl. 2x DPR). */
export const productThumbnailSizes =
  "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px";
