import * as Sentry from "@sentry/nextjs";
import {
  getSentryDsn,
  getSentryEnvironment,
  getTracesSampleRate,
  isSentryEnabled,
} from "@/lib/sentry/shared";

Sentry.init({
  dsn: getSentryDsn(),
  enabled: isSentryEnabled(),
  environment: getSentryEnvironment(),
  // Keep edge lightweight — middleware is mostly auth/routing.
  tracesSampleRate: Math.min(getTracesSampleRate(), 0.05),
  sendDefaultPii: false,
});
