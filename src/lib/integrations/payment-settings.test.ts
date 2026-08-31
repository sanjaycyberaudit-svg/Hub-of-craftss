import {
  CASHFREE_PRODUCTION_BASE_URL,
  CASHFREE_SANDBOX_BASE_URL,
  normalizeCashfreeIncoming,
  normalizePhonePeIncoming,
  parseEnabledPhonePeValue,
  parseIncomingPhonePeForEnable,
  resolveCashfreeBaseUrl,
} from "./payment-settings";

describe("payment-settings", () => {
  it("maps production environment to the live Cashfree base URL", () => {
    expect(
      resolveCashfreeBaseUrl({
        environment: "production",
        baseUrl: CASHFREE_SANDBOX_BASE_URL,
      }),
    ).toBe(CASHFREE_PRODUCTION_BASE_URL);
  });

  it("maps sandbox environment to the sandbox Cashfree base URL", () => {
    expect(
      resolveCashfreeBaseUrl({
        environment: "sandbox",
        baseUrl: CASHFREE_PRODUCTION_BASE_URL,
      }),
    ).toBe(CASHFREE_SANDBOX_BASE_URL);
  });

  it("normalizes mismatched Cashfree environment and base URL on save", () => {
    const normalized = normalizeCashfreeIncoming({
      clientId: "cf-id",
      clientSecret: "cf-secret",
      baseUrl: CASHFREE_SANDBOX_BASE_URL,
      environment: "production",
      apiVersion: "2026-01-01",
    });

    expect(normalized.baseUrl).toBe(CASHFREE_PRODUCTION_BASE_URL);
    expect(normalized.environment).toBe("production");
  });

  it("defaults apiVersion to 2026-01-01 when omitted", () => {
    const normalized = normalizeCashfreeIncoming({
      clientId: "cf-id",
      clientSecret: "cf-secret",
      environment: "production",
    });
    expect(normalized.apiVersion).toBe("2026-01-01");
  });

  it("allows saving disabled PhonePe without OAuth credentials", () => {
    const normalized = normalizePhonePeIncoming({
      clientId: "",
      clientSecret: "",
      clientVersion: "",
    });

    expect(normalized.clientId).toBe("");
    expect(parseEnabledPhonePeValue(normalized).success).toBe(false);
  });

  it("maps legacy Merchant ID / Salt Key labels to OAuth fields", () => {
    const normalized = normalizePhonePeIncoming({
      merchantId: "SU2608311227207616155508",
      saltKey: "52492232-e44d-497a-b63b-47568c22d7d7",
      saltIndex: "1",
      baseUrl: "https://api.phonepe.com/apis/hermes",
    });

    expect(normalized).toEqual({
      clientId: "SU2608311227207616155508",
      clientVersion: "1",
      clientSecret: "52492232-e44d-497a-b63b-47568c22d7d7",
      environment: "production",
    });
  });

  it("requires complete PhonePe OAuth credentials when enabling", () => {
    const parsed = parseIncomingPhonePeForEnable({
      clientId: "SU2608311227207616155508",
      clientVersion: "1",
      clientSecret: "52492232-e44d-497a-b63b-47568c22d7d7",
      environment: "production",
    });

    expect(parsed.success).toBe(true);
  });
});
