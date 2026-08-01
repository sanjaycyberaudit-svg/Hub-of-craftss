/** Shared Sentry helpers — keep DSN/env resolution in one place. */

export function getSentryDsn(): string | undefined {
  const dsn =
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
    process.env.SENTRY_DSN?.trim() ||
    "";
  return dsn || undefined;
}

export function getSentryEnvironment(): string {
  return (
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
    process.env.SENTRY_ENVIRONMENT?.trim() ||
    process.env.VERCEL_ENV?.trim() ||
    process.env.NODE_ENV ||
    "development"
  );
}

export function isSentryEnabled(): boolean {
  if (!getSentryDsn()) return false;
  if (process.env.SENTRY_ENABLED === "false") return false;
  if (process.env.NEXT_PUBLIC_SENTRY_ENABLED === "false") return false;
  // Local noise is opt-in (set either flag).
  if (process.env.NODE_ENV === "development") {
    return (
      process.env.SENTRY_ENABLE_DEV === "true" ||
      process.env.NEXT_PUBLIC_SENTRY_ENABLE_DEV === "true"
    );
  }
  return true;
}

export function getTracesSampleRate(): number {
  const raw = process.env.SENTRY_TRACES_SAMPLE_RATE?.trim();
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) return parsed;
  }
  return process.env.NODE_ENV === "development" ? 1 : 0.1;
}
