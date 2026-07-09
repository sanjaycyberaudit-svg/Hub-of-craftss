/**
 * Push .env.local variables to linked Vercel project (production + preview).
 * Run: node scripts/push-vercel-env.mjs
 */
import { readFileSync } from "fs";
import { spawnSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
const lines = readFileSync(envPath, "utf8").split("\n");
const vars = {};

for (const line of lines) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq < 1) continue;
  const key = t.slice(0, eq).trim();
  const value = t.slice(eq + 1).trim();
  if (key) vars[key] = value;
}

// Production site URL — keep custom domain from .env.local; only override via VERCEL_SITE_URL.
if (process.env.VERCEL_SITE_URL?.trim()) {
  vars.NEXT_PUBLIC_SITE_URL = process.env.VERCEL_SITE_URL.trim();
}
vars.SKIP_ENV_VALIDATION = "true";

const targets = ["production", "preview"];

for (const [key, value] of Object.entries(vars)) {
  for (const target of targets) {
    const r = spawnSync(
      "vercel",
      ["env", "add", key, target, "--force", "--yes"],
      {
        input: value,
        cwd: root,
        encoding: "utf8",
        shell: true,
      },
    );
    if (r.status !== 0 && !String(r.stderr || "").includes("already")) {
      console.warn(key, target, r.stderr || r.stdout);
    } else {
      console.log("OK", key, target);
    }
  }
}

console.log("Done. Redeploy on Vercel.");
