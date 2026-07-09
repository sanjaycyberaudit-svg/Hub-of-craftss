/**
 * Supabase deprecated direct host db.<ref>.supabase.co (ENOTFOUND on Vercel).
 * Rewrites to pooler: postgres.<ref>@aws-1-<region>.pooler.supabase.com:6543
 */
const DEFAULT_REGION = "ap-south-1";
const DEFAULT_AWS_PREFIX = "aws-1";

export type PoolerUrlOptions = {
  projectRef: string;
  password: string;
  region?: string;
  awsPrefix?: string;
  port?: number;
};

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
  const port = options.port ?? 6543;

  return `postgresql://postgres.${options.projectRef}:${encoded}@${awsPrefix}-${region}.pooler.supabase.com:${port}/postgres`;
}

function parseLegacyDirectUrl(
  url: string,
): { ref: string; password: string } | null {
  try {
    const parsed = new URL(url.replace(/^postgresql:/i, "http:"));
    const match = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    if (!match) return null;
    const password = decodeURIComponent(parsed.password);
    if (!password) return null;
    return { ref: match[1], password };
  } catch {
    return null;
  }
}

/** Fix pooler URLs that use the old aws-0 host for this project's region. */
function fixOutdatedPoolerHost(url: string): string {
  return url.replace(
    /@aws-0-ap-south-1\.pooler\.supabase\.com/i,
    "@aws-1-ap-south-1.pooler.supabase.com",
  );
}

export function resolveDatabaseUrl(raw?: string): string {
  const poolerOverride = process.env.SUPABASE_DB_POOLER_URL?.trim();
  if (poolerOverride) return fixOutdatedPoolerHost(poolerOverride);

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
    const fixed = fixOutdatedPoolerHost(url);
    if (fixed !== url) {
      console.warn(
        "[db] Updated pooler host aws-0-ap-south-1 → aws-1-ap-south-1.",
      );
    }
    return fixed;
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
      `[db] Rewrote deprecated db.${legacy.ref}.supabase.co to ${awsPrefix}-${region} pooler.`,
    );
    return fixed;
  }

  return url;
}
