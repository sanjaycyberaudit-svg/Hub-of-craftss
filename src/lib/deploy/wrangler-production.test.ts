import { spawnSync } from "node:child_process";
import path from "node:path";

describe("production wrangler config", () => {
  const script = path.join(
    process.cwd(),
    "scripts/validate-wrangler-production.mjs",
  );

  it("accepts the canonical production wrangler config", () => {
    const result = spawnSync(
      process.execPath,
      [script, "wrangler.workers.new-account.jsonc"],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("OK");
  });

  it("accepts the legacy alias after ISR bindings were synced", () => {
    const result = spawnSync(
      process.execPath,
      [script, "wrangler.workers.jsonc"],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(0);
  });
});
