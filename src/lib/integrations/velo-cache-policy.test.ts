import {
  veloActionNeedsRouteCacheInvalidation,
  veloActionSkipsIdempotency,
} from "./velo-cache-policy";

describe("velo-cache-policy", () => {
  it("skips route invalidate for reads and collection mutations", () => {
    expect(veloActionNeedsRouteCacheInvalidation("list")).toBe(false);
    expect(veloActionNeedsRouteCacheInvalidation("meta")).toBe(false);
    expect(veloActionNeedsRouteCacheInvalidation("resolveImages")).toBe(false);
    expect(veloActionNeedsRouteCacheInvalidation("upsertCollection")).toBe(
      false,
    );
    expect(veloActionNeedsRouteCacheInvalidation("deleteCollection")).toBe(
      false,
    );
  });

  it("requires route invalidate once for product mutations", () => {
    expect(veloActionNeedsRouteCacheInvalidation("upsert")).toBe(true);
    expect(veloActionNeedsRouteCacheInvalidation("bulk_upsert")).toBe(true);
    expect(veloActionNeedsRouteCacheInvalidation("delete")).toBe(true);
  });

  it("skips idempotency for resolveImages and deleteCollection", () => {
    expect(veloActionSkipsIdempotency("resolveImages")).toBe(true);
    expect(veloActionSkipsIdempotency("deleteCollection")).toBe(true);
    expect(veloActionSkipsIdempotency("upsert")).toBe(false);
    expect(veloActionSkipsIdempotency("meta")).toBe(false);
  });
});
