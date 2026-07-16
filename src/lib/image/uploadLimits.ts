/** Absolute max accepted from client / FormData (phone camera originals). */
export const UPLOAD_LIMIT_BYTES = 15 * 1024 * 1024;

export const UPLOAD_LIMIT_MB = Math.round(UPLOAD_LIMIT_BYTES / (1024 * 1024));

/**
 * Max size for direct-upload staging sessions.
 * Admin always compresses to ~650 KB WebP in-browser; keep modest headroom
 * without allowing multi-MB originals into Worker memory.
 */
export const STAGING_UPLOAD_LIMIT_BYTES = 1.5 * 1024 * 1024;

export const STAGING_UPLOAD_LIMIT_MB = Math.round(
  STAGING_UPLOAD_LIMIT_BYTES / (1024 * 1024),
);
