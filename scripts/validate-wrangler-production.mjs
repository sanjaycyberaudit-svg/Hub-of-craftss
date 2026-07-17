#!/usr/bin/env node
/**
 * Fail fast if a Wrangler config is missing OpenNext ISR bindings.
 * Prevents accidental Free-tier Error 1102 from ISR-miss storms.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const DEFAULT_CONFIG = "wrangler.workers.new-account.jsonc";
const configArg = process.argv[2] || DEFAULT_CONFIG;
const configPath = path.isAbsolute(configArg)
  ? configArg
  : path.join(root, configArg);

function stripJsonc(raw) {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function fail(message) {
  console.error(`[validate-wrangler] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(configPath)) {
  fail(`Missing config file: ${configPath}`);
}

let config;
try {
  config = JSON.parse(stripJsonc(fs.readFileSync(configPath, "utf8")));
} catch (error) {
  fail(`Invalid JSONC in ${configPath}: ${error instanceof Error ? error.message : error}`);
}

if (config.name !== "hub-of-craftss") {
  fail(`Expected worker name "hub-of-craftss", got "${config.name}"`);
}

if (config.assets?.run_worker_first !== false) {
  fail('assets.run_worker_first must be false so static assets bypass Worker CPU');
}

const r2Bindings = new Set(
  (config.r2_buckets || []).map((bucket) => bucket.binding),
);
for (const required of ["MEDIA_BUCKET", "NEXT_INC_CACHE_R2_BUCKET"]) {
  if (!r2Bindings.has(required)) {
    fail(`Missing required R2 binding: ${required}`);
  }
}

const doBindings = new Set(
  (config.durable_objects?.bindings || []).map((binding) => binding.name),
);
if (!doBindings.has("NEXT_CACHE_DO_QUEUE")) {
  fail('Missing Durable Object binding: NEXT_CACHE_DO_QUEUE');
}

const hasMigration = (config.migrations || []).some((migration) =>
  (migration.new_sqlite_classes || []).includes("DOQueueHandler"),
);
if (!hasMigration) {
  fail("Missing DOQueueHandler sqlite migration for OpenNext cache queue");
}

console.log(`[validate-wrangler] OK ${path.relative(root, configPath)}`);
