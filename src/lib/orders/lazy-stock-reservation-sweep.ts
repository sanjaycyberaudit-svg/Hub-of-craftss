import {
  getIntegrationSetting,
  INTEGRATION_KEYS,
} from "@/lib/integrations/settings";
import { redisGet, redisSet } from "@/lib/cache/redis";
import { releaseExpiredStockReservations } from "@/lib/orders/stock-reservation";
import {
  getLastLazyStockSweepAtMs,
  LAZY_STOCK_SWEEP_DISTRIBUTED_INTERVAL_MS,
  markLazyStockSweepRan,
  shouldRunLazyStockSweep,
} from "@/lib/orders/lazy-stock-reservation-sweep-policy";

export {
  LAZY_STOCK_SWEEP_MIN_INTERVAL_MS,
  LAZY_STOCK_SWEEP_DISTRIBUTED_INTERVAL_MS,
  resetLazyStockSweepThrottleForTests,
  shouldRunLazyStockSweep,
} from "@/lib/orders/lazy-stock-reservation-sweep-policy";

const REDIS_SWEEP_KEY = "ops:stock-sweep:last-ms";

async function shouldRunDistributedSweep(nowMs: number, force: boolean) {
  if (force) return true;

  if (
    !shouldRunLazyStockSweep(
      getLastLazyStockSweepAtMs(),
      nowMs,
      false,
      LAZY_STOCK_SWEEP_DISTRIBUTED_INTERVAL_MS,
    )
  ) {
    return false;
  }

  const lastRemote = await redisGet<number>(REDIS_SWEEP_KEY);
  if (
    typeof lastRemote === "number" &&
    nowMs - lastRemote < LAZY_STOCK_SWEEP_DISTRIBUTED_INTERVAL_MS
  ) {
    return false;
  }

  return true;
}

async function markDistributedSweepRan(nowMs: number) {
  markLazyStockSweepRan(nowMs);
  void redisSet(
    REDIS_SWEEP_KEY,
    nowMs,
    Math.ceil(LAZY_STOCK_SWEEP_DISTRIBUTED_INTERVAL_MS / 1000) + 60,
  );
}

export type LazyStockReservationSweepResult = {
  ran: boolean;
  skippedReason?: "stock_control_disabled" | "throttled";
  scanned?: number;
  released?: number;
  error?: string;
};

export async function sweepExpiredStockReservationsIfEnabled(options?: {
  force?: boolean;
  lookbackHours?: number;
  limit?: number;
  stockControlEnabled?: boolean;
  nowMs?: number;
}): Promise<LazyStockReservationSweepResult> {
  let stockControlEnabled = options?.stockControlEnabled;
  if (stockControlEnabled === undefined) {
    const setting = await getIntegrationSetting(INTEGRATION_KEYS.stockControl);
    stockControlEnabled = Boolean(setting?.isEnabled);
  }

  if (!stockControlEnabled) {
    return { ran: false, skippedReason: "stock_control_disabled" };
  }

  const nowMs = options?.nowMs ?? Date.now();
  if (!(await shouldRunDistributedSweep(nowMs, Boolean(options?.force)))) {
    return { ran: false, skippedReason: "throttled" };
  }

  await markDistributedSweepRan(nowMs);

  try {
    const result = await releaseExpiredStockReservations({
      lookbackHours: options?.lookbackHours ?? 168,
      limit: options?.limit ?? 100,
    });

    if (result.released > 0) {
      console.info(
        `[stock-reservation] lazy sweep released ${result.released} expired hold(s)`,
      );
    }

    return {
      ran: true,
      scanned: result.scanned,
      released: result.released,
    };
  } catch (error) {
    console.error("[stock-reservation] lazy sweep failed:", error);
    return {
      ran: true,
      error: error instanceof Error ? error.message : "lazy sweep failed",
    };
  }
}
