import { sanitizeTrackingNumber } from "./tracking-sanitizer";

describe("sanitizeTrackingNumber", () => {
  it("returns null for empty input", () => {
    expect(sanitizeTrackingNumber(null)).toBeNull();
    expect(sanitizeTrackingNumber("   ")).toBeNull();
  });
  it("removes whitespace and uppercases", () => {
    expect(sanitizeTrackingNumber(" ab -123 45 ")).toBe("AB-12345");
  });
  it("rejects unsupported characters", () => {
    expect(() => sanitizeTrackingNumber("AB#123")).toThrow(
      /Invalid tracking number/i,
    );
  });
  it("enforces max length", () => {
    expect(() => sanitizeTrackingNumber("A".repeat(65))).toThrow(/too long/i);
  });
});
