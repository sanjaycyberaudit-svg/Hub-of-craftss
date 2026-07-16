import { UPLOAD_LIMIT_BYTES } from "./uploadLimits";

export { UPLOAD_LIMIT_BYTES } from "./uploadLimits";

/** Max width stored in R2 — detail/zoom; Next.js Image serves smaller sizes. */
export const MAX_IMAGE_WIDTH = 1600;

export const WEBP_QUALITY = 80;
/** Hard cap for bytes held in the Worker after staging fetch / FormData. */
export const MAX_PROCESSED_IMAGE_BYTES = 1 * 1024 * 1024;

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

const FORMAT_META: Record<string, { contentType: string; extension: string }> =
  {
    jpeg: { contentType: "image/jpeg", extension: "jpg" },
    png: { contentType: "image/png", extension: "png" },
    webp: { contentType: "image/webp", extension: "webp" },
    gif: { contentType: "image/gif", extension: "gif" },
  };

function toBuffer(bytes: Uint8Array): Buffer {
  return Buffer.isBuffer(bytes)
    ? bytes
    : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

/**
 * Validate image bytes in place (no File / arrayBuffer copies).
 * Native `sharp` cannot run on Workers — admin uploads are compressed in-browser.
 */
export function processImageBytes(bytes: Uint8Array): ProcessedImage {
  if (bytes.length === 0) {
    throw new Error("Empty file.");
  }
  if (bytes.length > UPLOAD_LIMIT_BYTES) {
    throw new Error("Each image must be 15 MB or smaller.");
  }

  const format = sniffFormat(bytes);
  if (!format) {
    throw new Error("Only image files are allowed.");
  }
  if (format === "svg") {
    throw new Error("SVG uploads are not supported. Use JPEG or PNG.");
  }

  if (format === "gif" && isAnimatedGif(bytes)) {
    if (bytes.length > MAX_PROCESSED_IMAGE_BYTES) {
      throw new Error(
        "Animated GIF is too large. Use a shorter clip or WebP under 1 MB.",
      );
    }
    return {
      buffer: toBuffer(bytes),
      contentType: "image/gif",
      extension: "gif",
    };
  }

  if (bytes.length > MAX_PROCESSED_IMAGE_BYTES) {
    throw new Error(
      "Image is too large after upload. Use JPEG/WebP under 1 MB (admin uploads are auto-compressed to WebP in the browser).",
    );
  }

  const meta = FORMAT_META[format];
  return {
    buffer: toBuffer(bytes),
    contentType: meta.contentType,
    extension: meta.extension,
  };
}

/**
 * Normalize uploads for R2 storage on Cloudflare Workers.
 */
export async function processUploadedImage(
  file: File,
): Promise<ProcessedImage> {
  if (file.size > UPLOAD_LIMIT_BYTES) {
    throw new Error("Each image must be 15 MB or smaller.");
  }

  const input = new Uint8Array(await file.arrayBuffer());
  return processImageBytes(input);
}

/** Process raw bytes (direct upload finalize / Velo) without File wrapping. */
export async function processUploadedImageBuffer(
  input: Buffer,
  _fileName = "image",
): Promise<ProcessedImage> {
  return processImageBytes(input);
}
