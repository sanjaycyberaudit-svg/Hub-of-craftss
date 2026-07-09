import postgres from "postgres";

const CASHFREE_SANDBOX_BASE_URL = "https://sandbox.cashfree.com/pg";
const CASHFREE_PRODUCTION_BASE_URL = "https://api.cashfree.com/pg";

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

function resolveCashfreeBaseUrl(environment, baseUrl) {
  const normalized = String(baseUrl ?? "")
    .trim()
    .replace(/\/$/, "");
  const pointsToSandbox = normalized.includes("sandbox.cashfree.com");
  if (environment === "production") {
    if (!normalized || pointsToSandbox) return CASHFREE_PRODUCTION_BASE_URL;
    return normalized;
  }
  if (!normalized) return CASHFREE_SANDBOX_BASE_URL;
  return normalized;
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

try {
  const [row] = await sql`
    SELECT value FROM api_settings WHERE key = 'cashfree' AND is_enabled = true
  `;
  const value = parseSettingValue(row?.value);
  const environment =
    String(value.environment ?? "sandbox").toLowerCase() === "production"
      ? "production"
      : "sandbox";
  const baseUrl = resolveCashfreeBaseUrl(environment, value.baseUrl);
  const clientId = String(value.clientId ?? "").trim();
  const clientSecret = String(value.clientSecret ?? "").trim();
  const apiVersion = String(value.apiVersion ?? "2025-01-01").trim();

  console.log({ environment, baseUrl, clientIdPrefix: clientId.slice(0, 8), apiVersion });

  const res = await fetch(`${baseUrl}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": clientId,
      "x-client-secret": clientSecret,
      "x-api-version": apiVersion,
    },
    body: JSON.stringify({
      order_id: `test_${Date.now()}`,
      order_amount: 1,
      order_currency: "INR",
      customer_details: {
        customer_id: "test_customer",
        customer_phone: "9999999999",
      },
      order_meta: {
        return_url:
          "https://www.sairaghavendratex.com/api/cashfree/redirect?order_id={order_id}",
        notify_url: "https://www.sairaghavendratex.com/api/cashfree/webhook",
      },
    }),
  });

  const data = await res.json().catch(() => null);
  console.log("HTTP", res.status);
  console.log(JSON.stringify(data, null, 2));
} finally {
  await sql.end();
}
