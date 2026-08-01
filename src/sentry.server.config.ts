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
  tracesSampleRate: getTracesSampleRate(),
  sendDefaultPii: false,
});
