import { buildPostgresClientOptions } from "./postgres-client-options";

describe("buildPostgresClientOptions", () => {
  it("disables pipeline for Supavisor transaction pooler", () => {
    const singleton = buildPostgresClientOptions(1);
    expect(singleton.max_pipeline).toBe(0);
    expect(singleton.prepare).toBe(false);
    expect(singleton.max).toBe(1);
  });

  it("uses shorter idle timeout for non-singleton pools", () => {
    const pooled = buildPostgresClientOptions(5);
    expect(pooled.max).toBe(5);
    expect(pooled.max_pipeline).toBe(0);
    expect(pooled.idle_timeout).toBeLessThan(
      buildPostgresClientOptions(1).idle_timeout,
    );
  });
});
