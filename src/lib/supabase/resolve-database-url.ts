/**
 * Supabase direct host db.<ref>.supabase.co is unreliable from Vercel.
 * Hub of craftss uses aws-1-ap-south-1 transaction pooler (port 6543).
 */
const DEFAULT_REGION = "ap-south-1";
const DEFAULT_AWS_PREFIX = "aws-1";
export const TRANSACTION_POOLER_PORT = 6543;
export const SESSION_POOLER_PORT = 5432;

export type PoolerUrlOptions = {
  projectRef: string;
  password: string;
  region?: string;
  awsPrefix?: string;
  port?: number;
};

export type DatabaseUrlResolution = {
  url: string;
  rewrites: string[];
};

function toHttpUrl(url: string): string {
  return url.replace(/^postgresql:/i, "http:");
}

function fromHttpUrl(url: string): string {
  return url.replace(/^http:/i, "postgresql:");
}

function shouldUseSessionPooler(): boolean {
  return process.env.SUPABASE_DB_SESSION_POOLER?.trim() === "true";
}

export function buildSupabasePoolerUrl(options: PoolerUrlOptions): string {
  const region =
    options.region?.trim() ||
    process.env.SUPABASE_DB_REGION?.trim() ||
    DEFAULT_REGION;
  const awsPrefix =
    options.awsPrefix?.trim() ||
    process.env.SUPABASE_DB_AWS_PREFIX?.trim() ||
    DEFAULT_AWS_PREFIX;
  const encoded = encodeURIComponent(options.password);
  const port =
    options.port ??
    (shouldUseSessionPooler() ? SESSION_POOLER_PORT : TRANSACTION_POOLER_PORT);

  return `postgresql://postgres.${options.projectRef}:${encoded}@${awsPrefix}-${region}.pooler.supabase.com:${port}/postgres`;
}

function parseLegacyDirectUrl(
  url: string,
): { ref: string; password: string } | null {
  try {
    const parsed = new URL(toHttpUrl(url));
    const match = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    if (!match) return null;
    const password = decodeURIComponent(parsed.password);
    if (!password) return null;
    return { ref: match[1], password };
  } catch {
    return null;
  }
}

/**
 * Normalize Supabase pooler URLs for serverless (Hub):
 * - aws-0 → aws-1 (this shop uses aws-1)
 * - session :5432 → transaction :6543 (unless session explicitly requested)
 */
export function normalizePoolerDatabaseUrl(url: string): DatabaseUrlResolution {
  const rewrites: string[] = [];

  try {
    const parsed = new URL(toHttpUrl(url));
    if (!/\.pooler\.supabase\.com$/i.test(parsed.hostname)) {
      return { url, rewrites };
    }

    if (/^aws-0-/i.test(parsed.hostname)) {
      parsed.hostname = parsed.hostname.replace(/^aws-0-/i, "aws-1-");
      rewrites.push("aws-0 host → aws-1");
    }

    const port = Number(parsed.port || SESSION_POOLER_PORT);
    const wantsSession = shouldUseSessionPooler();

    if (!wantsSession && port === SESSION_POOLER_PORT) {
      parsed.port = String(TRANSACTION_POOLER_PORT);
      rewrites.push(
        `:${SESSION_POOLER_PORT} session → :${TRANSACTION_POOLER_PORT} transaction`,
      );
    }

    return { url: fromHttpUrl(parsed.toString()), rewrites };
  } catch {
    return { url, rewrites };
  }
}

export function describeDatabaseUrl(raw?: string): {
  host: string;
  port: string;
  pooler: boolean;
  rewrites: string[];
  url: string;
} {
  const url = resolveDatabaseUrl(raw);
  try {
    const parsed = new URL(toHttpUrl(url));
    const rewrites =
      raw && /pooler\.supabase\.com/i.test(raw)
        ? normalizePoolerDatabaseUrl(raw).rewrites
        : [];
    return {
      host: parsed.host,
      port: parsed.port || String(SESSION_POOLER_PORT),
      pooler: /\.pooler\.supabase\.com$/i.test(parsed.hostname),
      rewrites,
      url,
    };
  } catch {
    return {
      host: "",
      port: "",
      pooler: false,
      rewrites: [],
      url,
    };
  }
}

export function resolveDatabaseUrl(raw?: string): string {
  const poolerOverride = process.env.SUPABASE_DB_POOLER_URL?.trim();
  if (poolerOverride) {
    const normalized = normalizePoolerDatabaseUrl(poolerOverride);
    if (normalized.rewrites.length) {
      console.warn(
        `[db] Pooler override normalized (${normalized.rewrites.join(", ")}).`,
      );
    }
    return normalized.url;
  }

  const url = (raw ?? process.env.DATABASE_URL ?? "").trim();

  if (!url) {
    const password = process.env.SUPABASE_DB_PASSWORD?.trim();
    const ref = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF?.trim();
    if (password && ref) {
      return buildSupabasePoolerUrl({ projectRef: ref, password });
    }
    return url;
  }

  if (/pooler\.supabase\.com/i.test(url)) {
    const normalized = normalizePoolerDatabaseUrl(url);
    if (normalized.rewrites.length) {
      console.warn(
        `[db] DATABASE_URL normalized (${normalized.rewrites.join(", ")}).`,
      );
    }
    return normalized.url;
  }

  const legacy = parseLegacyDirectUrl(url);
  if (legacy) {
    const region = process.env.SUPABASE_DB_REGION?.trim() || DEFAULT_REGION;
    const awsPrefix =
      process.env.SUPABASE_DB_AWS_PREFIX?.trim() || DEFAULT_AWS_PREFIX;
    const fixed = buildSupabasePoolerUrl({
      projectRef: legacy.ref,
      password: legacy.password,
      region,
      awsPrefix,
    });
    console.warn(
      `[db] Rewrote deprecated db.${legacy.ref}.supabase.co to ${awsPrefix}-${region} pooler :${TRANSACTION_POOLER_PORT}.`,
    );
    return fixed;
  }

  return url;
}
