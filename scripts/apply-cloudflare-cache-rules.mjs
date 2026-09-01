#!/usr/bin/env node
/**
 * Apply Hub production Cloudflare Cache Rules (idempotent).
 *
 * Requires API token for the Shaaru Cloudflare account (hubsofcraftss.com zone):
 *   CF_API_TOKEN or CLOUDFLARE_API_TOKEN
 * Permissions: Zone → Cache Rules → Edit (or Zone Rulesets Edit)
 *
 * Usage:
 *   npm run apply:cloudflare-cache
 *   npm run apply:cloudflare-cache -- --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import {
  hostFromOrigin,
  loadProjectIdentity,
  PROJECT_ROOT,
} from "./lib/load-project-identity.mjs";

dotenv.config({ path: path.join(PROJECT_ROOT, ".env.local") });

const dryRun = process.argv.includes("--dry-run");
const identity = loadProjectIdentity();
const rulesConfigPath = path.join(
  PROJECT_ROOT,
  "infra/cloudflare-cache-rules.hub.json",
);
const rulesConfig = JSON.parse(fs.readFileSync(rulesConfigPath, "utf8"));
const host = hostFromOrigin(identity.site.canonicalOrigin);

const token =
  process.env.CF_API_TOKEN?.trim() || process.env.CLOUDFLARE_API_TOKEN?.trim();

if (!token) {
  console.error(
    "[cloudflare-cache] Missing CF_API_TOKEN or CLOUDFLARE_API_TOKEN.",
  );
  console.error(
    "[cloudflare-cache] Create a token for account shaarunew01 with Zone.Cache Rules Edit on hubsofcraftss.com.",
  );
  process.exit(1);
}

async function cf(pathname, options = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const body = await response.json();
  if (!body.success) {
    const message =
      body.errors?.map((e) => e.message).join("; ") || response.statusText;
    throw new Error(`Cloudflare API ${pathname}: ${message}`);
  }
  return body.result;
}

function buildManagedRules(existingRules = []) {
  const prefix = "Hub of craftss:";
  const managed = rulesConfig.rules.map((rule) => ({
    description: rule.description.startsWith(prefix)
      ? rule.description
      : `${prefix} ${rule.description}`,
    expression: rule.expression,
    action: rule.action,
    action_parameters: rule.action_parameters,
    enabled: true,
  }));

  const preserved = (existingRules ?? []).filter(
    (rule) =>
      !rule.description?.startsWith(prefix) && rule.description !== undefined,
  );

  return [...managed, ...preserved];
}

async function main() {
  console.log(`[cloudflare-cache] zone host=${host}`);
  const zones = await cf(`/zones?name=${encodeURIComponent(host)}`);
  const zone = zones?.[0];
  if (!zone?.id) {
    throw new Error(`Zone not found for ${host} with this API token`);
  }
  console.log(`[cloudflare-cache] zoneId=${zone.id} plan=${zone.plan?.name ?? "unknown"}`);

  const phase = "http_request_cache_settings";
  const entrypoint = await cf(
    `/zones/${zone.id}/rulesets/phases/${phase}/entrypoint`,
  );

  const nextRules = buildManagedRules(entrypoint?.rules ?? []);
  const hubRuleCount = rulesConfig.rules.length;
  console.log(
    `[cloudflare-cache] applying ${hubRuleCount} Hub rules (${nextRules.length} total rules in phase)`,
  );

  if (dryRun) {
    console.log(JSON.stringify({ rules: nextRules }, null, 2));
    return;
  }

  const updated = await cf(
    `/zones/${zone.id}/rulesets/phases/${phase}/entrypoint`,
    {
      method: "PUT",
      body: JSON.stringify({ rules: nextRules }),
    },
  );

  console.log(
    `[cloudflare-cache] OK — ruleset ${updated.id} updated (${updated.rules?.length ?? 0} rules)`,
  );
}

main().catch((error) => {
  console.error(`[cloudflare-cache] FAILED: ${error.message}`);
  process.exit(1);
});
