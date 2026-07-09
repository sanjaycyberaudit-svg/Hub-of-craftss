import sharp from "sharp";
import { UPLOAD_LIMIT_BYTES } from "./uploadLimits";

export { UPLOAD_LIMIT_BYTES } from "./uploadLimits";

/** Max width stored in S3 — detail/zoom; Next.js Image serves smaller sizes. */
export const MAX_IMAGE_WIDTH = 2000;

export const WEBP_QUALITY = 82;
export const MAX_PROCESSED_IMAGE_BYTES = 2.75 * 1024 * 1024;

export type ProcessedImage = {
  buffer: Buffer;
  contentType: string;
  extension: string;
};

/**
 * Normalize any uploaded image (JPEG, PNG, WebP, HEIC, static GIF, etc.)
 * for storage and storefront delivery.
 */
export async function processUploadedImage(
  file: File,
): Promise<ProcessedImage> {
  if (file.size > UPLOAD_LIMIT_BYTES) {
    throw new Error("Each image must be 15 MB or smaller.");
  }

  const input = Buffer.from(await file.arrayBuffer());
  if (input.length === 0) {
    throw new Error("Empty file.");
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(input, { animated: true }).metadata();
  } catch {
    throw new Error("Only image files are allowed.");
  }

  if (!metadata.width || !metadata.height) {
    throw new Error("Could not read image dimensions.");
  }

  if (metadata.format === "svg") {
    throw new Error("SVG uploads are not supported. Use JPEG or PNG.");
  }

  const isAnimatedGif = metadata.format === "gif" && (metadata.pages ?? 1) > 1;

  if (isAnimatedGif) {
    return {
      buffer: input,
      contentType: "image/gif",
      extension: "gif",
    };
  }
  const attempts = [
    { width: MAX_IMAGE_WIDTH, quality: WEBP_QUALITY },
    { width: MAX_IMAGE_WIDTH, quality: 78 },
    { width: MAX_IMAGE_WIDTH, quality: 74 },
    { width: 1800, quality: 78 },
    { width: 1800, quality: 74 },
    { width: 1600, quality: 74 },
  ] as const;

  let buffer = Buffer.alloc(0);
  for (const attempt of attempts) {
    // Keep resolution first, then reduce quality/size in safe steps.
    // eslint-disable-next-line no-await-in-loop
    const output = await sharp(input)
      .rotate()
      .resize({
        width: attempt.width,
        withoutEnlargement: true,
      })
      .webp({ quality: attempt.quality })
      .toBuffer();

    if (!buffer.length || output.length < buffer.length) {
      buffer = output;
    }

    if (output.length <= MAX_PROCESSED_IMAGE_BYTES) {
      buffer = output;
      break;
    }
  }

  return {
    buffer,
    contentType: "image/webp",
    extension: "webp",
  };
}
