import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { resolve } from "node:path";

/**
 * Cloudflare Pages publishes ONE output directory.
 * OpenNext builds SSR at `.open-next/worker.js` and static files at `.open-next/assets`.
 *
 * Publishing only `.open-next/assets` (without a worker) causes HTTP 404.
 * This script creates `.open-next/pages` = static assets + `_worker.js` + `_routes.json`.
 */
const workerSource = resolve(".open-next", "worker.js");
const assetsDir = resolve(".open-next", "assets");
const pagesDir = resolve(".open-next", "pages");

if (!existsSync(workerSource)) {
  console.error(`Missing ${workerSource}. Did opennextjs-cloudflare build run?`);
  process.exit(1);
}
if (!existsSync(assetsDir)) {
  console.error(`Missing ${assetsDir}. Did opennextjs-cloudflare build run?`);
  process.exit(1);
}

rmSync(pagesDir, { recursive: true, force: true });
mkdirSync(pagesDir, { recursive: true });
cpSync(assetsDir, pagesDir, { recursive: true });
copyFileSync(workerSource, resolve(pagesDir, "_worker.js"));

writeFileSync(
  resolve(pagesDir, "_routes.json"),
  JSON.stringify(
    {
      version: 1,
      include: ["/*"],
      exclude: ["/_next/static/*"],
    },
    null,
    2,
  ),
);

console.log("Prepared Cloudflare Pages output: .open-next/pages");
console.log("  - static assets copied from .open-next/assets");
console.log("  - _worker.js");
console.log("  - _routes.json");
