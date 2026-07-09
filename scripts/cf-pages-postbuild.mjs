import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

// Cloudflare Pages expects an entrypoint named `_worker.js` in the output directory
// when using the Pages Functions / Workers runtime.
const source = resolve(".open-next", "worker.js");
const target = resolve(".open-next", "_worker.js");

if (!existsSync(source)) {
  console.error(`Missing ${source}. Did opennextjs-cloudflare build run?`);
  process.exit(1);
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log("Prepared .open-next/_worker.js for Cloudflare Pages");

