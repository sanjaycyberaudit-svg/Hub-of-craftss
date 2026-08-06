/**
 * Configure Supabase Auth site URL, redirect allow list, and Google OAuth.
 * Uses project.identity.json as the source of truth for project + redirects.
 *
 * Required in .env.local:
 *   SUPABASE_ACCESS_TOKEN  — https://supabase.com/dashboard/account/tokens
 *
 * Optional:
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 *   NEXT_PUBLIC_SITE_URL or SUPABASE_SITE_URL (must match identity hosts)
 *
 * Run: npm run validate:identity && node scripts/setup-auth-config.mjs
 */
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  hostFromOrigin,
  identityAuthCallbackUrls,
  loadProjectIdentity,
} from "./lib/load-project-identity.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const identity = loadProjectIdentity();
const projectRef =
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF?.trim() ||
  identity.supabase.projectRef;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const siteUrl = (
  process.env.SUPABASE_SITE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  identity.site.canonicalOrigin
).replace(/\/$/, "");

function missing(label) {
  console.error(`Missing ${label}. Add it to .env.local and run again.`);
  process.exit(1);
}

if (!accessToken) missing("SUPABASE_ACCESS_TOKEN");

if (projectRef !== identity.supabase.projectRef) {
  console.error(
    `Refusing auth setup: project ref ${projectRef} ≠ identity ${identity.supabase.projectRef}`,
  );
  process.exit(1);
}

const siteHost = hostFromOrigin(siteUrl);
const allowedHosts = new Set([
  hostFromOrigin(identity.site.canonicalOrigin),
  hostFromOrigin(identity.site.wwwOrigin),
  ...identity.site.localOrigins.map(hostFromOrigin),
]);
if (!allowedHosts.has(siteHost)) {
  console.error(
    `Refusing auth setup: site host "${siteHost}" not allowed by project.identity.json`,
  );
  process.exit(1);
}
if (identity.forbidden.siteHosts.map((h) => h.toLowerCase()).includes(siteHost)) {
  console.error(`Refusing auth setup: site host "${siteHost}" is forbidden`);
  process.exit(1);
}

const redirectAllowList = identityAuthCallbackUrls(identity).join(",");

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

console.log("Configuring Supabase Auth from project.identity.json");
console.log("Project:", projectRef);
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
console.log(
  "  Google enabled:",
  updated.external_google_enabled ??
    payload.external_google_enabled ??
    "(unchanged)",
);
console.log(
  "\nDone. Sign out, sign in again, then open /admin on",
  identity.site.canonicalOrigin,
);
