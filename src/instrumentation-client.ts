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
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  // Avoid leaking PII from ecommerce forms into Sentry by default.
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
