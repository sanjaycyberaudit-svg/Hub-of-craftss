export type CourierChargesConfig = {
  enabled: boolean;
  tamilNaduBase: number;
  southStatesBase: number;
  restOfIndiaBase: number;
  qty2To4AddOn: number;
  qty5PlusFlat: number;
  gstEnabled: boolean;
  gstPercentage: number;
};

export type CourierChargeBreakdown = {
  state: string;
  normalizedState: string;
  quantity: number;
  charge: number;
  ruleApplied: "qty1_base" | "qty2_4_add_on" | "qty5_plus_flat";
  region: "tamil_nadu" | "south_states" | "rest_of_india";
};

const SOUTH_STATES = new Set([
  "karnataka",
  "andhra pradesh",
  "andhra",
  "telangana",
  "hyderabad",
  "kerala",
]);

export function normalizeStateForCourier(state: string): string {
  return state.toLowerCase().replace(/\s+/g, " ").trim();
}

export function calculateCourierCharge(params: {
  state: string;
  quantity: number;
  config: CourierChargesConfig;
}): CourierChargeBreakdown {
  const normalizedState = normalizeStateForCourier(params.state);
  const quantity = Math.max(1, Math.round(params.quantity));
  const config = params.config;
  const isTamilNadu =
    normalizedState === "tamil nadu" || normalizedState === "tamilnadu";

  const region: CourierChargeBreakdown["region"] = isTamilNadu
    ? "tamil_nadu"
    : SOUTH_STATES.has(normalizedState)
      ? "south_states"
      : "rest_of_india";

  const base =
    region === "tamil_nadu"
      ? config.tamilNaduBase
      : region === "south_states"
        ? config.southStatesBase
        : config.restOfIndiaBase;

  if (quantity >= 5) {
    return {
      state: params.state,
      normalizedState,
      quantity,
      charge: config.qty5PlusFlat,
      ruleApplied: "qty5_plus_flat",
      region,
    };
  }

  if (quantity >= 2) {
    return {
      state: params.state,
      normalizedState,
      quantity,
      charge: base + config.qty2To4AddOn,
      ruleApplied: "qty2_4_add_on",
      region,
    };
  }

  return {
    state: params.state,
    normalizedState,
    quantity,
    charge: base,
    ruleApplied: "qty1_base",
    region,
  };
}

export function calculateGstAmount(params: {
  taxableAmount: number;
  config: CourierChargesConfig;
}): number {
  if (!params.config.gstEnabled) return 0;
  const amount = Number(params.taxableAmount);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const percentage = Math.max(0, Number(params.config.gstPercentage ?? 0));
  return Math.round(amount * percentage * 100) / 10000;
}
