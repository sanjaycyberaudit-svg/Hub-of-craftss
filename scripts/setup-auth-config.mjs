/**
 * Configure Supabase Auth site URL, redirect allow list, and Google OAuth.
 *
 * Required in .env.local:
 *   SUPABASE_ACCESS_TOKEN  — https://supabase.com/dashboard/account/tokens
 *
 * Optional:
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 *   NEXT_PUBLIC_SITE_URL or SUPABASE_SITE_URL
 *
 * Run: node scripts/setup-auth-config.mjs
 */
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const projectRef = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const siteUrl = (
  process.env.SUPABASE_SITE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "https://sairaghavendratex.com"
).replace(/\/$/, "");

function authCallback(origin) {
  return `${origin.replace(/\/$/, "")}/auth/callback`;
}

const redirectOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://ssr-tex-shop.vercel.app",
  siteUrl,
]);

try {
  const host = new URL(siteUrl).host;
  if (host.startsWith("www.")) {
    redirectOrigins.add(`https://${host.replace(/^www\./, "")}`);
  } else {
    redirectOrigins.add(`https://www.${host}`);
  }
} catch {
  /* ignore */
}

const redirectAllowList = [...redirectOrigins]
  .map((origin) => authCallback(origin))
  .join(",");

function missing(label) {
  console.error(`Missing ${label}. Add it to .env.local and run again.`);
  process.exit(1);
}

if (!projectRef) missing("NEXT_PUBLIC_SUPABASE_PROJECT_REF");
if (!accessToken) missing("SUPABASE_ACCESS_TOKEN");

const apiBase = "https://api.supabase.com/v1";

async function api(path, options = {}) {
  const res = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} → ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

console.log("Configuring Supabase Auth for project:", projectRef);
console.log("Site URL:", siteUrl);
console.log("Redirect allow list:", redirectAllowList);

const payload = {
  site_url: siteUrl,
  uri_allow_list: redirectAllowList,
  external_email_enabled: true,
  disable_signup: false,
  // Skip confirmation emails — reduces bounces from typos, bots, and test signups.
  // Google OAuth users are already verified by Google.
  mailer_autoconfirm: true,
};

if (googleClientId && googleClientSecret) {
  payload.external_google_enabled = true;
  payload.external_google_client_id = googleClientId;
  payload.external_google_secret = googleClientSecret;
}

const updated = await api(`/projects/${projectRef}/config/auth`, {
  method: "PATCH",
  body: JSON.stringify(payload),
});

console.log("\nAuth config updated.");
console.log("  Site URL:", updated.site_url ?? siteUrl);
console.log("  Google enabled:", updated.external_google_enabled ?? payload.external_google_enabled ?? "(unchanged)");
console.log("\nDone. Sign out, sign in again, then open /admin on your custom domain.");
