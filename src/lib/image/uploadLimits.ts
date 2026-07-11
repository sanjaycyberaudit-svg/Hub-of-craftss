/** Absolute max accepted from client / FormData (phone camera originals). */
export const UPLOAD_LIMIT_BYTES = 15 * 1024 * 1024;

export const UPLOAD_LIMIT_MB = Math.round(UPLOAD_LIMIT_BYTES / (1024 * 1024));

/**
 * Max size for direct-upload staging sessions.
 * Admin always compresses in-browser first; keep a small headroom above
 * MAX_PROCESSED_IMAGE_BYTES without allowing full 15 MB into Worker memory.
 */
export const STAGING_UPLOAD_LIMIT_BYTES = 4 * 1024 * 1024;

export const STAGING_UPLOAD_LIMIT_MB = Math.round(
  STAGING_UPLOAD_LIMIT_BYTES / (1024 * 1024),
);
