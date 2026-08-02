import { getFreeShippingProgress } from "@/lib/courier/free-shipping-progress";
import type { CourierChargesConfig } from "@/lib/courier/calculate";

const baseConfig: Pick<
  CourierChargesConfig,
  "enabled" | "freeShippingEnabled" | "freeShippingMin"
> = {
  enabled: true,
  freeShippingEnabled: true,
  freeShippingMin: 999,
};

describe("getFreeShippingProgress", () => {
  it("returns null when courier or free shipping is off", () => {
    expect(
      getFreeShippingProgress({
        orderAmount: 500,
        config: { ...baseConfig, freeShippingEnabled: false },
      }),
    ).toBeNull();
    expect(
      getFreeShippingProgress({
        orderAmount: 500,
        config: { ...baseConfig, enabled: false },
      }),
    ).toBeNull();
  });

  it("returns null when threshold is zero", () => {
    expect(
      getFreeShippingProgress({
        orderAmount: 500,
        config: { ...baseConfig, freeShippingMin: 0 },
      }),
    ).toBeNull();
  });

  it("computes remaining and progress below threshold", () => {
    const result = getFreeShippingProgress({
      orderAmount: 350,
      config: baseConfig,
    });
    expect(result).toEqual({
      threshold: 999,
      orderAmount: 350,
      remaining: 649,
      progress: 350 / 999,
      unlocked: false,
    });
  });

  it("marks unlocked at or above threshold", () => {
    const at = getFreeShippingProgress({
      orderAmount: 999,
      config: baseConfig,
    });
    expect(at?.unlocked).toBe(true);
    expect(at?.remaining).toBe(0);
    expect(at?.progress).toBe(1);

    const above = getFreeShippingProgress({
      orderAmount: 1500,
      config: baseConfig,
    });
    expect(above?.unlocked).toBe(true);
    expect(above?.progress).toBe(1);
    expect(above?.remaining).toBe(0);
  });
});
