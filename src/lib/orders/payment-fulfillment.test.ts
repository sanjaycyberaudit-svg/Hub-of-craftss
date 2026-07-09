import { resolveCheckoutPaymentEnvironment } from "./checkout-environment";

describe("resolveCheckoutPaymentEnvironment", () => {
  it("returns sandbox for cashfree test credentials", () => {
    expect(
      resolveCheckoutPaymentEnvironment({
        preferCashfree: true,
        preferPhonePe: false,
        cashfreeConfig: {
          clientId: "id",
          clientSecret: "secret",
          baseUrl: "https://sandbox.cashfree.com/pg",
          apiVersion: "2025-01-01",
          environment: "sandbox",
          enabled: true,
        },
        phonePeConfig: null,
      }),
    ).toBe("sandbox");
  });

  it("returns production for cashfree live credentials", () => {
    expect(
      resolveCheckoutPaymentEnvironment({
        preferCashfree: true,
        preferPhonePe: false,
        cashfreeConfig: {
          clientId: "id",
          clientSecret: "secret",
          baseUrl: "https://api.cashfree.com/pg",
          apiVersion: "2025-01-01",
          environment: "production",
          enabled: true,
        },
        phonePeConfig: null,
      }),
    ).toBe("production");
  });
});
