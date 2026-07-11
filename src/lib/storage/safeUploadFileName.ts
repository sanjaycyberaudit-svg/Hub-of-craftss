/**
 * Shared upload filename / media-alt sanitization.
 * Used by media library, product drafts, banners (via media picker), and Velo.
 *
 * Why: long Instagram-style names, emoji (🏆), and odd punctuation break
 * Zod max(255), Postgres `medias.alt` varchar(255), and some File/FormData paths.
 */

/** Matches `medias.alt` varchar(255). */
export const MEDIA_ALT_MAX_LENGTH = 255;

/** Short ASCII base for File.name / display in APIs. */
const SAFE_FILE_BASE_MAX = 80;

const ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "heic",
  "heif",
  "avif",
]);

export function sanitizeExtension(fileName: string): string {
  const match = fileName.match(/\.([a-zA-Z0-9]+)$/);
  const ext = match?.[1]?.toLowerCase() ?? "jpg";
  return ALLOWED_EXTENSIONS.has(ext) ? ext : "jpg";
}

function stripDiacritics(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

/** Truncate by Unicode code points (handles emoji surrogate pairs). */
export function truncateUnicode(value: string, maxChars: number): string {
  if (maxChars <= 0) return "";
  const chars = Array.from(value);
  if (chars.length <= maxChars) return value;
  if (maxChars === 1) return "…";
  return `${chars.slice(0, maxChars - 1).join("")}…`;
}

/**
 * Human-readable alt text safe for DB varchar(255).
 * Keeps letters/numbers/punctuation; drops control chars; truncates.
 */
export function toMediaAltText(fileName: string): string {
  let alt = (fileName || "image")
    .normalize("NFC")
    // Remove ASCII controls without triggering no-control-regex
    .split("")
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();

  if (!alt) alt = "image";
  return truncateUnicode(alt, MEDIA_ALT_MAX_LENGTH);
}

/**
 * Safe filesystem-style name: ascii slug + allowed extension.
 * Always suitable for File.name and API `fileName` fields.
 */
export function sanitizeUploadFileName(fileName: string): string {
  const raw = (fileName || "image").trim() || "image";
  const lastDot = raw.lastIndexOf(".");
  const baseRaw = lastDot > 0 ? raw.slice(0, lastDot) : raw;
  const ext = sanitizeExtension(raw);

  let base = stripDiacritics(baseRaw)
    .replace(/[^\w\s.-]+/g, " ")
    .replace(/[_\s.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  if (!base) base = "image";
  base = truncateUnicode(base, SAFE_FILE_BASE_MAX).replace(/…$/g, "");
  if (!base) base = "image";

  return `${base}.${ext}`;
}

/**
 * Clone a File with a safe name while preserving bytes/type.
 * Returns sanitized display name + DB-safe alt from the original name.
 */
export function withSafeUploadFile(file: File): {
  file: File;
  fileName: string;
  alt: string;
} {
  const fileName = sanitizeUploadFileName(file.name);
  const alt = toMediaAltText(file.name);
  const safeFile =
    file.name === fileName
      ? file
      : new File([file], fileName, {
          type: file.type,
          lastModified: file.lastModified,
        });

  return { file: safeFile, fileName, alt };
}
