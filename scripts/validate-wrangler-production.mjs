#!/usr/bin/env node
/**
 * Fail fast if a Wrangler config is missing OpenNext ISR bindings
 * or drifts from project.identity.json.
 */
import path from "node:path";
import {
  loadProjectIdentity,
  PROJECT_ROOT,
  readJsoncFile,
} from "./lib/load-project-identity.mjs";

const identity = loadProjectIdentity();
const DEFAULT_CONFIG = identity.cloudflare.productionWranglerConfig;
const configArg = process.argv[2] || DEFAULT_CONFIG;
const configPath = path.isAbsolute(configArg)
  ? configArg
  : path.join(PROJECT_ROOT, configArg);

function fail(message) {
  console.error(`[validate-wrangler] ${message}`);
  process.exit(1);
}

const { data: config } = readJsoncFile(configPath);

if (config.name !== identity.cloudflare.workerName) {
  fail(
    `Expected worker name "${identity.cloudflare.workerName}", got "${config.name}"`,
  );
}

if (config.account_id && config.account_id !== identity.cloudflare.accountId) {
  fail(
    `account_id must be ${identity.cloudflare.accountId} (from project.identity.json)`,
  );
}

if (config.assets?.run_worker_first !== false) {
  fail("assets.run_worker_first must be false so static assets bypass Worker CPU");
}

const r2Bindings = new Set(
  (config.r2_buckets || []).map((bucket) => bucket.binding),
);
for (const required of ["MEDIA_BUCKET", "NEXT_INC_CACHE_R2_BUCKET"]) {
  if (!r2Bindings.has(required)) {
    fail(`Missing required R2 binding: ${required}`);
  }
}

const r2Names = new Map(
  (config.r2_buckets || []).map((bucket) => [bucket.binding, bucket.bucket_name]),
);
if (r2Names.get("MEDIA_BUCKET") !== identity.cloudflare.r2.mediaBucket) {
  fail(
    `MEDIA_BUCKET must be ${identity.cloudflare.r2.mediaBucket} (project.identity.json)`,
  );
}
if (
  r2Names.get("NEXT_INC_CACHE_R2_BUCKET") !==
  identity.cloudflare.r2.nextCacheBucket
) {
  fail(
    `NEXT_INC_CACHE_R2_BUCKET must be ${identity.cloudflare.r2.nextCacheBucket} (project.identity.json)`,
  );
}

const doBindings = new Set(
  (config.durable_objects?.bindings || []).map((binding) => binding.name),
);
if (!doBindings.has("NEXT_CACHE_DO_QUEUE")) {
  fail("Missing Durable Object binding: NEXT_CACHE_DO_QUEUE");
}

const hasMigration = (config.migrations || []).some((migration) =>
  (migration.new_sqlite_classes || []).includes("DOQueueHandler"),
);
if (!hasMigration) {
  fail("Missing DOQueueHandler sqlite migration for OpenNext cache queue");
}

console.log(
  `[validate-wrangler] OK ${path.relative(PROJECT_ROOT, configPath)} (identity ${identity.project.slug})`,
);
