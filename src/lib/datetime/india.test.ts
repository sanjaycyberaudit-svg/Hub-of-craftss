import {
  INDIA_TIME_ZONE,
  buildOrderPlacedAtPayload,
  formatOrderDateIst,
  formatOrderDateTimeIst,
} from "./india";

describe("India (Kolkata) order datetime", () => {
  it("formats a known UTC instant in Asia/Kolkata", () => {
    // 2026-07-11T10:52:00.000Z = 16:22 / 4:22 pm IST
    const utc = "2026-07-11T10:52:00.000Z";
    const text = formatOrderDateTimeIst(utc);
    expect(text).toContain("2026");
    expect(text).toContain("IST");
    expect(text).toMatch(/4:22|16:22|04:22/i);
  });

  it("returns em dash for invalid dates", () => {
    expect(formatOrderDateTimeIst("not-a-date")).toBe("—");
    expect(formatOrderDateIst(null)).toBe("—");
  });

  it("builds Velo/notification payload with UTC + IST", () => {
    const payload = buildOrderPlacedAtPayload("2026-07-11T10:52:00.000Z");
    expect(payload.timeZone).toBe(INDIA_TIME_ZONE);
    expect(payload.placedAt).toBe("2026-07-11T10:52:00.000Z");
    expect(payload.placedAtIst).toContain("IST");
  });
});
