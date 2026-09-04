import {
  formatInternalOrderRef,
  internalOrderRefPrefixFromDate,
  isValidInternalOrderRef,
  nextInternalOrderSeq,
  parseInternalOrderRef,
} from "./internal-order-ref";

describe("internal order ref (YYMM####)", () => {
  it("formats September 2026 first paid order as 26090001", () => {
    expect(formatInternalOrderRef("2609", 1)).toBe("26090001");
    expect(formatInternalOrderRef("2609", 12)).toBe("26090012");
    expect(formatInternalOrderRef("2609", 9999)).toBe("26099999");
  });

  it("builds IST prefix from a known UTC instant", () => {
    // 2026-09-04 12:00 IST = 2026-09-04 06:30 UTC
    const { yymm, year, month } = internalOrderRefPrefixFromDate(
      new Date("2026-09-04T06:30:00.000Z"),
    );
    expect(year).toBe(2026);
    expect(month).toBe(9);
    expect(yymm).toBe("2609");
    expect(formatInternalOrderRef(yymm, 1)).toBe("26090001");
  });

  it("uses IST month near UTC month boundary", () => {
    // 2026-08-31 23:30 IST is still August; 18:00 UTC same day is evening IST Aug 31
    const aug = internalOrderRefPrefixFromDate(
      new Date("2026-08-31T18:00:00.000Z"),
    );
    expect(aug.yymm).toBe("2608");

    // 2026-08-31 19:00 UTC = 2026-09-01 00:30 IST → September
    const sep = internalOrderRefPrefixFromDate(
      new Date("2026-08-31T19:00:00.000Z"),
    );
    expect(sep.yymm).toBe("2609");
  });

  it("parses and validates refs", () => {
    expect(parseInternalOrderRef("26090001")).toEqual({
      yymm: "2609",
      seq: 1,
    });
    expect(isValidInternalOrderRef("26090001")).toBe(true);
    expect(isValidInternalOrderRef("2609")).toBe(false);
    expect(isValidInternalOrderRef("abc")).toBe(false);
    expect(parseInternalOrderRef("26090000")).toBeNull();
  });

  it("increments sequence and rejects overflow", () => {
    expect(nextInternalOrderSeq(0)).toBe(1);
    expect(nextInternalOrderSeq(7)).toBe(8);
    expect(() => nextInternalOrderSeq(9999)).toThrow(/exhausted/i);
  });

  it("rejects bad format inputs", () => {
    expect(() => formatInternalOrderRef("260", 1)).toThrow(/prefix/i);
    expect(() => formatInternalOrderRef("2609", 0)).toThrow(/range/i);
  });
});
