/** Days after archive before product photos are removed (order text is kept). */
export const ARCHIVE_MEDIA_PURGE_DAYS = 30;

/** Unpaid/abandoned checkout orders older than this are deleted entirely. */
export const UNPAID_ORDER_RETENTION_DAYS = 30;

export function addDays(from: Date, days: number): Date {
  const next = new Date(from);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function retentionCutoffIso(now: Date, retentionDays: number): string {
  return addDays(now, -retentionDays).toISOString();
}

export function mediaPurgeAtIso(from: Date = new Date()): string {
  return addDays(from, ARCHIVE_MEDIA_PURGE_DAYS).toISOString();
}
