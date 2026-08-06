/**
 * Load Hub of craftss project.identity.json — single public source of truth.
 * Secrets never live here; only IDs, hosts, and account pins.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, "../..");
export const IDENTITY_PATH = path.join(PROJECT_ROOT, "project.identity.json");

function fail(message) {
  throw new Error(`[project-identity] ${message}`);
}

function assertString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    fail(`Missing or empty string: ${label}`);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) fail(`Expected array: ${label}`);
}

/** @returns {Record<string, any>} */
export function loadProjectIdentity() {
  if (!fs.existsSync(IDENTITY_PATH)) {
    fail(`Missing ${IDENTITY_PATH}. Create/update project.identity.json first.`);
  }

  let identity;
  try {
    identity = JSON.parse(fs.readFileSync(IDENTITY_PATH, "utf8"));
  } catch (error) {
    fail(
      `Invalid JSON in project.identity.json: ${
        error instanceof Error ? error.message : error
      }`,
    );
  }

  if (identity.version !== 1) {
    fail(`Unsupported identity version: ${identity.version}`);
  }

  assertString(identity.project?.name, "project.name");
  assertString(identity.project?.slug, "project.slug");
  assertString(identity.site?.canonicalOrigin, "site.canonicalOrigin");
  assertString(identity.supabase?.projectRef, "supabase.projectRef");
  assertString(identity.supabase?.url, "supabase.url");
  assertString(identity.cloudflare?.accountId, "cloudflare.accountId");
  assertString(identity.cloudflare?.accountEmail, "cloudflare.accountEmail");
  assertString(identity.cloudflare?.workerName, "cloudflare.workerName");
  assertString(
    identity.cloudflare?.productionWranglerConfig,
    "cloudflare.productionWranglerConfig",
  );
  assertString(identity.cloudflare?.r2?.mediaBucket, "cloudflare.r2.mediaBucket");
  assertString(
    identity.cloudflare?.r2?.s3Endpoint,
    "cloudflare.r2.s3Endpoint",
  );
  assertString(identity.vercel?.projectSlug, "vercel.projectSlug");
  assertString(identity.github?.owner, "github.owner");
  assertArray(identity.authRedirectOrigins, "authRedirectOrigins");
  assertArray(identity.forbidden?.siteHosts, "forbidden.siteHosts");

  const expectedUrl = `https://${identity.supabase.projectRef}.supabase.co`;
  if (identity.supabase.url.replace(/\/$/, "") !== expectedUrl) {
    fail(
      `supabase.url must be ${expectedUrl} (got ${identity.supabase.url})`,
    );
  }

  return identity;
}

export function identityAuthCallbackUrls(identity = loadProjectIdentity()) {
  return identity.authRedirectOrigins.map(
    (origin) => `${origin.replace(/\/$/, "")}/auth/callback`,
  );
}

export function stripJsonc(raw) {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

export function readJsoncFile(relativeOrAbsolute) {
  const full = path.isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : path.join(PROJECT_ROOT, relativeOrAbsolute);
  if (!fs.existsSync(full)) {
    fail(`Missing config file: ${full}`);
  }
  try {
    return {
      path: full,
      data: JSON.parse(stripJsonc(fs.readFileSync(full, "utf8"))),
    };
  } catch (error) {
    fail(
      `Invalid JSONC in ${full}: ${
        error instanceof Error ? error.message : error
      }`,
    );
  }
}

export function hostFromOrigin(origin) {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return "";
  }
}
