import {
  buildCheckoutMoneyTotals,
  calculateCourierCharge,
  calculateGstAmount,
  getGstInclusiveFactor,
  toGstInclusiveAmount,
  type CourierChargesConfig,
} from "@/lib/courier/calculate";

const baseConfig: CourierChargesConfig = {
  enabled: true,
  tamilNaduBase: 80,
  southStatesBase: 120,
  restOfIndiaBase: 120,
  qty2To4AddOn: 0,
  qty5PlusFlat: 120,
  freeShippingEnabled: false,
  freeShippingMin: 999,
  gstEnabled: false,
  gstPercentage: 0,
};

describe("calculateCourierCharge free shipping", () => {
  it("uses normal slab when free shipping is disabled even above threshold", () => {
    const result = calculateCourierCharge({
      state: "Tamil Nadu",
      quantity: 1,
      orderAmount: 1500,
      config: baseConfig,
    });
    expect(result.charge).toBe(80);
    expect(result.ruleApplied).toBe("qty1_base");
  });

  it("applies free shipping at or above threshold when enabled", () => {
    const config = { ...baseConfig, freeShippingEnabled: true };
    const at = calculateCourierCharge({
      state: "Karnataka",
      quantity: 2,
      orderAmount: 999,
      config,
    });
    expect(at.charge).toBe(0);
    expect(at.ruleApplied).toBe("free_shipping");
    expect(at.region).toBe("south_states");

    const above = calculateCourierCharge({
      state: "Delhi",
      quantity: 5,
      orderAmount: 2000,
      config,
    });
    expect(above.charge).toBe(0);
    expect(above.ruleApplied).toBe("free_shipping");
  });

  it("keeps slab charge below threshold when free shipping is enabled", () => {
    const result = calculateCourierCharge({
      state: "Tamil Nadu",
      quantity: 1,
      orderAmount: 998,
      config: { ...baseConfig, freeShippingEnabled: true },
    });
    expect(result.charge).toBe(80);
    expect(result.ruleApplied).toBe("qty1_base");
  });

  it("treats missing orderAmount as not free shipping", () => {
    const result = calculateCourierCharge({
      state: "Kerala",
      quantity: 1,
      config: { ...baseConfig, freeShippingEnabled: true },
    });
    expect(result.charge).toBe(120);
    expect(result.ruleApplied).toBe("qty1_base");
  });
});

describe("GST inclusive display helpers", () => {
  const gstOn: CourierChargesConfig = {
    ...baseConfig,
    gstEnabled: true,
    gstPercentage: 18,
  };

  it("returns factor 1 when GST is off", () => {
    expect(getGstInclusiveFactor(baseConfig)).toBe(1);
    expect(toGstInclusiveAmount(1000, baseConfig)).toBe(1000);
  });

  it("bumps exclusive prices by GST % for storefront display", () => {
    expect(getGstInclusiveFactor(gstOn)).toBe(1.18);
    expect(toGstInclusiveAmount(1000, gstOn)).toBe(1180);
    expect(toGstInclusiveAmount(999, gstOn)).toBe(1178.82);
  });

  it("buildCheckoutMoneyTotals matches exclusive + courier + gst once", () => {
    const money = buildCheckoutMoneyTotals({
      exclusiveMerchandise: 1000,
      courierCharge: 80,
      config: gstOn,
    });
    const expectedGst = calculateGstAmount({
      taxableAmount: 1080,
      config: gstOn,
    });
    expect(money.gstAmount).toBe(expectedGst);
    expect(money.total).toBe(1000 + 80 + expectedGst);
    expect(money.displayMerchandise).toBe(1180);
    // Courier shown as entered; its GST is a separate row; rows sum to total.
    expect(money.courierCharge).toBe(80);
    expect(money.displayCourierGst).toBe(14.4);
    expect(
      money.displayMerchandise + money.courierCharge + money.displayCourierGst,
    ).toBe(money.total);
  });

  it("courier GST row sums exactly to total with awkward paise", () => {
    const money = buildCheckoutMoneyTotals({
      exclusiveMerchandise: 449.99,
      courierCharge: 50,
      config: gstOn,
    });
    expect(money.displayMerchandise).toBe(toGstInclusiveAmount(449.99, gstOn));
    expect(
      Math.round(
        (money.displayMerchandise +
          money.courierCharge +
          money.displayCourierGst) *
          100,
      ) / 100,
    ).toBe(money.total);
    expect(money.displayCourierGst).toBeCloseTo(9, 1);
  });

  it("no courier GST row when courier is free", () => {
    const money = buildCheckoutMoneyTotals({
      exclusiveMerchandise: 1000,
      courierCharge: 0,
      config: gstOn,
    });
    expect(money.displayCourierGst).toBe(0);
  });

  it("when GST off, display amounts equal exclusive and gst is 0", () => {
    const money = buildCheckoutMoneyTotals({
      exclusiveMerchandise: 500,
      courierCharge: 80,
      config: baseConfig,
    });
    expect(money.gstAmount).toBe(0);
    expect(money.total).toBe(580);
    expect(money.displayMerchandise).toBe(500);
    expect(money.courierCharge).toBe(80);
    expect(money.displayCourierGst).toBe(0);
  });
});
