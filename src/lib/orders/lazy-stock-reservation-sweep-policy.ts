export const LAZY_STOCK_SWEEP_MIN_INTERVAL_MS = 60_000;

let lastLazySweepAtMs = 0;

export function shouldRunLazyStockSweep(
  lastSweepAtMs: number,
  nowMs: number,
  force: boolean,
  minIntervalMs = LAZY_STOCK_SWEEP_MIN_INTERVAL_MS,
): boolean {
  if (force) return true;
  return nowMs - lastSweepAtMs >= minIntervalMs;
}

export function markLazyStockSweepRan(nowMs: number) {
  lastLazySweepAtMs = nowMs;
}

export function getLastLazyStockSweepAtMs() {
  return lastLazySweepAtMs;
}

export function resetLazyStockSweepThrottleForTests(nowMs = 0) {
  lastLazySweepAtMs = nowMs;
}
