#!/usr/bin/env node
/**
 * Apply Hub Cloudflare security baseline (zone settings).
 *
 * Token needs Zone Settings Edit on hubsofcraftss.com.
 *
 * Usage:
 *   npm run apply:cloudflare-security
 *   npm run apply:cloudflare-security -- --dry-run
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
const configPath = path.join(
  PROJECT_ROOT,
  "infra/cloudflare-security-baseline.hub.json",
);
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const host = hostFromOrigin(identity.site.canonicalOrigin);

const token =
  process.env.CF_API_TOKEN?.trim() || process.env.CLOUDFLARE_API_TOKEN?.trim();

if (!token) {
  console.error(
    "[cloudflare-security] Missing CF_API_TOKEN or CLOUDFLARE_API_TOKEN.",
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

async function main() {
  console.log(`[cloudflare-security] zone host=${host}`);
  const zones = await cf(`/zones?name=${encodeURIComponent(host)}`);
  const zone = zones?.[0];
  if (!zone?.id) {
    throw new Error(`Zone not found for ${host}`);
  }
  console.log(`[cloudflare-security] zoneId=${zone.id}`);

  for (const [settingId, value] of Object.entries(config.zoneSettings)) {
    if (dryRun) {
      console.log(`[dry-run] PATCH ${settingId}=${JSON.stringify(value)}`);
      continue;
    }

    const current = await cf(`/zones/${zone.id}/settings/${settingId}`);
    if (current?.value === value) {
      console.log(`[cloudflare-security] ${settingId} already ${JSON.stringify(value)}`);
      continue;
    }

    await cf(`/zones/${zone.id}/settings/${settingId}`, {
      method: "PATCH",
      body: JSON.stringify({ value }),
    });
    console.log(
      `[cloudflare-security] ${settingId}: ${JSON.stringify(current?.value)} -> ${JSON.stringify(value)}`,
    );
  }

  console.log("[cloudflare-security] OK");
}

main().catch((error) => {
  console.error(`[cloudflare-security] FAILED: ${error.message}`);
  process.exit(1);
});
