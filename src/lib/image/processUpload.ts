import { UPLOAD_LIMIT_BYTES } from "./uploadLimits";

export { UPLOAD_LIMIT_BYTES } from "./uploadLimits";

/** Max width stored in R2 — detail/zoom; Next.js Image serves smaller sizes. */
export const MAX_IMAGE_WIDTH = 2000;

export const WEBP_QUALITY = 82;
export const MAX_PROCESSED_IMAGE_BYTES = 2.75 * 1024 * 1024;

export type ProcessedImage = {
  buffer: Buffer;
  contentType: string;
  extension: string;
};

function sniffFormat(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return "gif";
  }
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x3c &&
    (bytes[1] === 0x3f || bytes[1] === 0x73 || bytes[1] === 0x53)
  ) {
    return "svg";
  }
  return null;
}

function isAnimatedGif(bytes: Uint8Array): boolean {
  let count = 0;
  for (let i = 0; i < bytes.length - 2; i++) {
    if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9 && bytes[i + 2] === 0x04) {
      count += 1;
      if (count > 1) return true;
    }
  }
  return false;
}

const FORMAT_META: Record<
  string,
  { contentType: string; extension: string }
> = {
  jpeg: { contentType: "image/jpeg", extension: "jpg" },
  png: { contentType: "image/png", extension: "png" },
  webp: { contentType: "image/webp", extension: "webp" },
  gif: { contentType: "image/gif", extension: "gif" },
};

/**
 * Normalize uploads for R2 storage on Cloudflare Workers.
 *
 * Native `sharp` cannot run on Workers. Admin uploads are already resized/
 * compressed in the browser (`client-image-upload`); this path validates the
 * file and stores it. Oversized raw payloads (e.g. Velo) are rejected so the
 * Worker stays within size limits without bundling WASM image codecs.
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

  const format = sniffFormat(input);
  if (!format) {
    throw new Error("Only image files are allowed.");
  }
  if (format === "svg") {
    throw new Error("SVG uploads are not supported. Use JPEG or PNG.");
  }

  if (format === "gif" && isAnimatedGif(input)) {
    if (input.length > MAX_PROCESSED_IMAGE_BYTES) {
      throw new Error(
        "Animated GIF is too large. Use a shorter clip or WebP under 2.75 MB.",
      );
    }
    return {
      buffer: input,
      contentType: "image/gif",
      extension: "gif",
    };
  }

  if (input.length > MAX_PROCESSED_IMAGE_BYTES) {
    throw new Error(
      "Image is too large after upload. Use JPEG/WebP under 2.75 MB (admin uploads are auto-compressed in the browser).",
    );
  }

  const meta = FORMAT_META[format];
  return {
    buffer: input,
    contentType: meta.contentType,
    extension: meta.extension,
  };
}

/** Process raw bytes (e.g. Velo base64 uploads) with the same pipeline. */
export async function processUploadedImageBuffer(
  input: Buffer,
  fileName = "image",
): Promise<ProcessedImage> {
  const file = new File([new Uint8Array(input)], fileName, {
    type: "application/octet-stream",
  });
  return processUploadedImage(file);
}
