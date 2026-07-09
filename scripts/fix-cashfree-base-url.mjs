import postgres from "postgres";

const CASHFREE_SANDBOX_BASE_URL = "https://sandbox.cashfree.com/pg";
const CASHFREE_PRODUCTION_BASE_URL = "https://api.cashfree.com/pg";

function resolveCashfreeBaseUrl(environment, baseUrl) {
  const normalized = String(baseUrl ?? "")
    .trim()
    .replace(/\/$/, "");
  const pointsToSandbox = normalized.includes("sandbox.cashfree.com");
  const pointsToProduction =
    normalized.includes("api.cashfree.com") ||
    normalized.includes("payments.cashfree.com");

  if (environment === "production") {
    if (!normalized || pointsToSandbox) return CASHFREE_PRODUCTION_BASE_URL;
    return normalized;
  }

  if (!normalized || pointsToProduction) return CASHFREE_SANDBOX_BASE_URL;
  return normalized;
}

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const sql = postgres(connectionString, { prepare: false, max: 1 });

function parseSettingValue(raw) {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
}

try {
  const [row] = await sql`
    SELECT key, is_enabled, value
    FROM api_settings
    WHERE key = 'cashfree'
  `;

  if (!row) {
    console.log("No Cashfree settings row found.");
    process.exit(0);
  }

  const value = parseSettingValue(row.value);
  const environment =
    String(value.environment ?? "sandbox").toLowerCase() === "production"
      ? "production"
      : "sandbox";
  const nextBaseUrl = resolveCashfreeBaseUrl(environment, value.baseUrl);

  console.log({
    enabled: row.is_enabled,
    environment,
    previousBaseUrl: value.baseUrl ?? null,
    nextBaseUrl,
  });

  if ((value.baseUrl ?? "") === nextBaseUrl) {
    console.log("Base URL already correct.");
    process.exit(0);
  }

  if (dryRun) {
    console.log("Dry run only — no update written.");
    process.exit(0);
  }

  const nextValue = { ...value, baseUrl: nextBaseUrl };
  await sql`
    UPDATE api_settings
    SET value = ${sql.json(nextValue)}
    WHERE key = 'cashfree'
  `;

  console.log("Updated Cashfree base URL in api_settings.");
} finally {
  await sql.end();
}
