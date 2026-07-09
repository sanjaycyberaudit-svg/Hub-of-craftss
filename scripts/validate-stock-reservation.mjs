#!/usr/bin/env node
/**
 * Production readiness checks for stock reservation.
 * Run: node scripts/validate-stock-reservation.mjs
 */
import { spawnSync } from "node:child_process";

const checks = [
  {
    name: "Stock reservation unit tests",
    cmd: "npm",
    args: [
      "test",
      "--",
      "src/lib/orders/stock-reservation.test.ts",
      "src/lib/orders/lazy-stock-reservation-sweep.test.ts",
      "src/lib/orders/payment-meta.test.ts",
      "src/lib/orders/payment-fulfillment.test.ts",
    ],
  },
];

let failed = 0;

for (const check of checks) {
  process.stdout.write(`\n▶ ${check.name}\n`);
  const result = spawnSync(check.cmd, check.args, {
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    failed += 1;
    process.stdout.write(`✗ ${check.name}\n`);
  } else {
    process.stdout.write(`✓ ${check.name}\n`);
  }
}

process.stdout.write("\nProduction checklist (manual):\n");
process.stdout.write("- [ ] UPSTASH_REDIS_REST_URL + TOKEN set (checkout rate limit)\n");
process.stdout.write("- [ ] Stock Control enabled in Admin settings\n");
process.stdout.write("- [ ] Cashfree production credentials (not sandbox)\n");
process.stdout.write("- [ ] Lazy stock sweep runs at checkout (no external cron required on Hobby)\n");
process.stdout.write("- [ ] Test one live checkout with qty=1 on a low-stock product\n");
process.stdout.write("- [ ] Abandon checkout, wait 20+ min, next checkout releases hold\n");

process.exit(failed > 0 ? 1 : 0);
