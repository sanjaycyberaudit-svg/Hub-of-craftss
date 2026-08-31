import { resolveCheckoutPaymentProvider } from "./resolve-checkout-provider";

const cashfree = {
  clientId: "id",
  clientSecret: "secret",
  baseUrl: "https://sandbox.cashfree.com/pg",
  apiVersion: "2025-01-01",
  environment: "sandbox" as const,
  enabled: true,
};

const phonePe = {
  clientId: "SUTEST",
  clientVersion: "1",
  clientSecret: "secret",
  environment: "production" as const,
  enabled: true,
};

describe("resolveCheckoutPaymentProvider", () => {
  it("prefers Cashfree when both gateways are configured", () => {
    expect(
      resolveCheckoutPaymentProvider({
        cashfreeConfig: cashfree,
        phonePeConfig: phonePe,
      }),
    ).toBe("cashfree");
  });

  it("uses PhonePe when Cashfree is unavailable", () => {
    expect(
      resolveCheckoutPaymentProvider({
        cashfreeConfig: null,
        phonePeConfig: phonePe,
      }),
    ).toBe("phonepe");
  });

  it("returns null when no gateway is configured", () => {
    expect(
      resolveCheckoutPaymentProvider({
        cashfreeConfig: null,
        phonePeConfig: null,
      }),
    ).toBeNull();
  });
});
