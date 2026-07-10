import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  copyFileSync,
  readdirSync,
} from "node:fs";
import { resolve } from "node:path";

/**
 * Cloudflare Pages publishes ONE output directory.
 * OpenNext builds SSR at `.open-next/worker.js` (with sibling runtime dirs)
 * and static files at `.open-next/assets`.
 *
 * `_worker.js` imports `./cloudflare/*`, `./middleware/*`, `./server-functions/*`,
 * and `./.build/*`, so those must sit next to `_worker.js` in the publish dir.
 */
const openNextDir = resolve(".open-next");
const workerSource = resolve(openNextDir, "worker.js");
const assetsDir = resolve(openNextDir, "assets");
const pagesDir = resolve(openNextDir, "pages");

const SKIP_FROM_RUNTIME = new Set(["assets", "pages", "worker.js"]);

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

// Static files first (HTML, _next/static, public assets).
cpSync(assetsDir, pagesDir, { recursive: true });

// OpenNext worker entry + runtime modules it imports relatively.
copyFileSync(workerSource, resolve(pagesDir, "_worker.js"));

for (const name of readdirSync(openNextDir)) {
  if (SKIP_FROM_RUNTIME.has(name)) continue;
  const src = resolve(openNextDir, name);
  cpSync(src, resolve(pagesDir, name), { recursive: true });
}

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
console.log("  - static assets from .open-next/assets");
console.log("  - _worker.js + OpenNext runtime modules");
console.log("  - _routes.json");
