import {
  ARCHIVE_MEDIA_PURGE_DAYS,
  addDays,
  mediaPurgeAtIso,
  retentionCutoffIso,
  UNPAID_ORDER_RETENTION_DAYS,
} from "@/lib/admin/product-lifecycle-policy";

describe("product-lifecycle-policy", () => {
  it("schedules media purge 30 days after archive", () => {
    const from = new Date("2026-07-08T12:00:00.000Z");
    expect(mediaPurgeAtIso(from)).toBe("2026-08-07T12:00:00.000Z");
    expect(ARCHIVE_MEDIA_PURGE_DAYS).toBe(30);
  });

  it("computes unpaid order retention cutoff", () => {
    const now = new Date("2026-07-08T12:00:00.000Z");
    expect(retentionCutoffIso(now, UNPAID_ORDER_RETENTION_DAYS)).toBe(
      addDays(now, -30).toISOString(),
    );
  });
});
