/** Max size before server-side processing (phone camera originals). */
export const UPLOAD_LIMIT_BYTES = 15 * 1024 * 1024;

export const UPLOAD_LIMIT_MB = Math.round(UPLOAD_LIMIT_BYTES / (1024 * 1024));
