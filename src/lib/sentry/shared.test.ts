import {
  getSentryDsn,
  getSentryEnvironment,
  getTracesSampleRate,
  isSentryEnabled,
} from "@/lib/sentry/shared";

function setEnv(key: string, value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

describe("sentry shared helpers", () => {
  const keys = [
    "NEXT_PUBLIC_SENTRY_DSN",
    "SENTRY_DSN",
    "SENTRY_ENABLED",
    "NEXT_PUBLIC_SENTRY_ENABLED",
    "SENTRY_ENABLE_DEV",
    "NEXT_PUBLIC_SENTRY_ENABLE_DEV",
    "SENTRY_TRACES_SAMPLE_RATE",
    "NEXT_PUBLIC_SENTRY_ENVIRONMENT",
    "SENTRY_ENVIRONMENT",
    "VERCEL_ENV",
    "NODE_ENV",
  ] as const;

  const previous = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of keys) {
      previous.set(key, process.env[key]);
      setEnv(key, undefined);
    }
  });

  afterEach(() => {
    for (const key of keys) {
      setEnv(key, previous.get(key));
    }
  });

  it("reads DSN from public or server env", () => {
    expect(getSentryDsn()).toBeUndefined();
    setEnv("NEXT_PUBLIC_SENTRY_DSN", "https://a@o1.ingest.sentry.io/1");
    expect(getSentryDsn()).toBe("https://a@o1.ingest.sentry.io/1");
  });

  it("stays disabled in development unless opted in", () => {
    setEnv("NODE_ENV", "development");
    setEnv("NEXT_PUBLIC_SENTRY_DSN", "https://a@o1.ingest.sentry.io/1");
    expect(isSentryEnabled()).toBe(false);
    setEnv("SENTRY_ENABLE_DEV", "true");
    expect(isSentryEnabled()).toBe(true);
  });

  it("enables in production when DSN is present", () => {
    setEnv("NODE_ENV", "production");
    setEnv("NEXT_PUBLIC_SENTRY_DSN", "https://a@o1.ingest.sentry.io/1");
    expect(isSentryEnabled()).toBe(true);
  });

  it("parses traces sample rate", () => {
    setEnv("SENTRY_TRACES_SAMPLE_RATE", "0.25");
    expect(getTracesSampleRate()).toBe(0.25);
  });

  it("prefers explicit environment labels", () => {
    setEnv("NEXT_PUBLIC_SENTRY_ENVIRONMENT", "staging");
    expect(getSentryEnvironment()).toBe("staging");
  });
});
