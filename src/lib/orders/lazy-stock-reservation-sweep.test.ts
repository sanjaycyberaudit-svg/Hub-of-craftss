import {
  LAZY_STOCK_SWEEP_MIN_INTERVAL_MS,
  resetLazyStockSweepThrottleForTests,
  shouldRunLazyStockSweep,
} from "./lazy-stock-reservation-sweep-policy";

describe("lazy stock reservation sweep policy", () => {
  it("always runs when forced", () => {
    expect(
      shouldRunLazyStockSweep(
        Date.now(),
        Date.now(),
        true,
        LAZY_STOCK_SWEEP_MIN_INTERVAL_MS,
      ),
    ).toBe(true);
  });

  it("throttles repeated sweeps within the interval", () => {
    const start = 1_000_000;
    expect(shouldRunLazyStockSweep(start, start + 30_000, false, 60_000)).toBe(
      false,
    );
    expect(shouldRunLazyStockSweep(start, start + 60_000, false, 60_000)).toBe(
      true,
    );
  });

  it("resets throttle baseline for tests", () => {
    resetLazyStockSweepThrottleForTests(0);
    expect(shouldRunLazyStockSweep(0, 30_000, false, 60_000)).toBe(false);
  });
});
