import { detectPaidAmountMismatch } from "./amount-check";

describe("detectPaidAmountMismatch", () => {
  it("accepts exact matches (decimal string from DB vs gateway number)", () => {
    expect(detectPaidAmountMismatch("499.00", 499).mismatch).toBe(false);
    expect(detectPaidAmountMismatch(499, 499.0).mismatch).toBe(false);
  });

  it("accepts sub-paisa rounding differences", () => {
    expect(detectPaidAmountMismatch("499.00", 499.004).mismatch).toBe(false);
  });

  it("flags real mismatches in either direction", () => {
    expect(detectPaidAmountMismatch("499.00", 1).mismatch).toBe(true);
    expect(detectPaidAmountMismatch("499.00", 498.5).mismatch).toBe(true);
    expect(detectPaidAmountMismatch("100.00", 100.02).mismatch).toBe(true);
  });

  it("fails closed when the gateway omits the amount", () => {
    expect(detectPaidAmountMismatch("499.00", null).mismatch).toBe(true);
    expect(detectPaidAmountMismatch("499.00", undefined).mismatch).toBe(true);
    expect(detectPaidAmountMismatch("499.00", NaN).mismatch).toBe(true);
  });

  it("does not block when the order has no expected amount to verify", () => {
    expect(detectPaidAmountMismatch(null, 499).mismatch).toBe(false);
    expect(detectPaidAmountMismatch("not-a-number", 499).mismatch).toBe(false);
    expect(detectPaidAmountMismatch("", 499).mismatch).toBe(false);
  });

  it("reports the parsed values for logging", () => {
    const result = detectPaidAmountMismatch("499.00", 100);
    expect(result).toEqual({ mismatch: true, expected: 499, actual: 100 });
  });
});
