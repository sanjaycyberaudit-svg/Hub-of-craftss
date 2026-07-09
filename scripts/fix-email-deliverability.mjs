/**
 * Reduce Supabase email bounces: audit users, remove test accounts, update auth config.
 *
 * Run: node scripts/fix-email-deliverability.mjs
 * Apply cleanup: node scripts/fix-email-deliverability.mjs --apply
 */
import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const apply = process.argv.includes("--apply");

function run(label, args) {
  console.log(`\n--- ${label} ---\n`);
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  return result.status ?? 1;
}

run("Audit auth emails", ["scripts/audit-auth-emails.mjs"]);
run(
  apply ? "Remove test/disposable users" : "Dry-run cleanup (add --apply to delete)",
  ["scripts/cleanup-test-auth-users.mjs", ...(apply ? ["--apply"] : [])],
);

if (process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
  const code = run("Update Supabase auth (auto-confirm + site URL)", [
    "scripts/setup-auth-config.mjs",
  ]);
  if (code !== 0) process.exit(code);
} else {
  console.log("\n--- Supabase dashboard (required if no access token) ---\n");
  console.log("1. Open Authentication → Providers → Email");
  console.log("2. Turn OFF “Confirm email” (or enable auto-confirm)");
  console.log("3. Avoid running verify-auth against production without --send-test-email");
  console.log("4. Optional: add custom SMTP under Project Settings → Auth → SMTP");
  console.log(
    "\nTo automate: add SUPABASE_ACCESS_TOKEN to .env.local and re-run this script.",
  );
}

console.log("\nDone.");
