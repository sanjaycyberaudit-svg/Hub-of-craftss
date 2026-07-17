import {
  buildCashfreeNotifyUrl,
  buildCashfreeReturnUrl,
  cashfreeCheckoutSessionSchema,
  getCashfreeHostedCheckoutUrl,
  readCashfreeCheckoutError,
  validateCashfreeCredentialEnvironment,
  validateCashfreeOrderAmount,
  validateCashfreeRuntimeConfig,
  validatePaymentSessionId,
} from "@/lib/payments/cashfree-standards";

describe("cashfree-standards", () => {
  it("builds canonical Cashfree callback URLs", () => {
    expect(buildCashfreeReturnUrl("https://hubsofcraftss.com/")).toBe(
      "https://hubsofcraftss.com/api/cashfree/redirect?order_id={order_id}",
    );
    expect(
      buildCashfreeReturnUrl("https://hubsofcraftss.com/", "tok_abc+/=_"),
    ).toBe(
      "https://hubsofcraftss.com/api/cashfree/redirect?order_id={order_id}&token=tok_abc%2B%2F%3D_",
    );
    expect(buildCashfreeNotifyUrl("https://hubsofcraftss.com")).toBe(
      "https://hubsofcraftss.com/api/cashfree/webhook",
    );
  });

  it("builds hosted checkout URLs per environment", () => {
    expect(getCashfreeHostedCheckoutUrl("sandbox")).toBe(
      "https://sandbox.cashfree.com/pg/view/sessions/checkout",
    );
    expect(getCashfreeHostedCheckoutUrl("production")).toBe(
      "https://api.cashfree.com/pg/view/sessions/checkout",
    );
  });

  it("validates payment session ids", () => {
    expect(validatePaymentSessionId("session_0nUQzx_LqpugkZrspPSp14Lp2a")).toBe(
      true,
    );
    expect(validatePaymentSessionId("invalid")).toBe(false);
  });

  it("rejects production credentials in sandbox mode", () => {
    expect(
      validateCashfreeCredentialEnvironment({
        clientId: "13253479cb51e39bd8b31444fca7435231",
        clientSecret: "cfsk_ma_prod_example",
        environment: "sandbox",
      }),
    ).toContain("Sandbox mode requires test Cashfree credentials");
  });

  it("rejects sandbox credentials in production mode", () => {
    expect(
      validateCashfreeCredentialEnvironment({
        clientId: "TEST123",
        clientSecret: "cfsk_ma_test_example",
        environment: "production",
      }),
    ).toContain("Production mode requires live Cashfree credentials");
  });

  it("validates a coherent production runtime config", () => {
    expect(
      validateCashfreeRuntimeConfig({
        clientId: "13253479cb51e39bd8b31444fca7435231",
        clientSecret: "cfsk_ma_prod_example",
        baseUrl: "https://api.cashfree.com/pg",
        apiVersion: "2025-01-01",
        environment: "production",
      }),
    ).toBeNull();
  });

  it("rejects invalid order amounts", () => {
    expect(validateCashfreeOrderAmount(0)).toContain("at least");
  });

  it("parses checkout session payloads", () => {
    const parsed = cashfreeCheckoutSessionSchema.parse({
      provider: "cashfree",
      orderId: "order_123",
      paymentSessionId: "session_abc123",
      environment: "production",
      returnUrl:
        "https://hubsofcraftss.com/api/cashfree/redirect?order_id={order_id}",
      checkoutOrigin: "https://hubsofcraftss.com",
    });

    expect(parsed.environment).toBe("production");
  });

  it("adds whitelisting guidance to domain errors", () => {
    const message = readCashfreeCheckoutError(
      { error: { message: "Domain is not whitelisted" } },
      {
        whitelistOrigin: "https://hubsofcraftss.com",
      },
    );

    expect(message).toContain("Domain is not whitelisted");
    expect(message).toContain("Whitelisting");
  });
});
