import {
  buildClientCashfreeReturnUrl,
  cashfreeCheckoutStartedKey,
  hasCashfreeCheckoutStarted,
  markCashfreeCheckoutStarted,
  openCashfreeCheckout,
  parseCashfreeCheckoutSessionPayload,
} from "@/lib/payments/cashfree-checkout-client";

describe("cashfree-checkout-client", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("builds client return URLs from the current origin", () => {
    expect(
      buildClientCashfreeReturnUrl(
        "https://www.hub-of-craftss.hubofcraftss.workers.dev",
      ),
    ).toBe(
      "https://www.hub-of-craftss.hubofcraftss.workers.dev/api/cashfree/redirect?order_id={order_id}",
    );
  });

  it("parses valid checkout session payloads", () => {
    const parsed = parseCashfreeCheckoutSessionPayload({
      provider: "cashfree",
      orderId: "order_123",
      paymentSessionId: "session_abc123",
      environment: "production",
      returnUrl:
        "https://www.hub-of-craftss.hubofcraftss.workers.dev/api/cashfree/redirect?order_id={order_id}",
      checkoutOrigin: "https://www.hub-of-craftss.hubofcraftss.workers.dev",
    });

    expect(parsed.paymentSessionId).toBe("session_abc123");
  });

  it("rejects malformed checkout session payloads", () => {
    expect(() =>
      parseCashfreeCheckoutSessionPayload({
        provider: "cashfree",
        orderId: "order_123",
        paymentSessionId: "bad",
        environment: "production",
        returnUrl:
          "https://www.hub-of-craftss.hubofcraftss.workers.dev/api/cashfree/redirect?order_id={order_id}",
        checkoutOrigin: "https://www.hub-of-craftss.hubofcraftss.workers.dev",
      }),
    ).toThrow("Invalid Cashfree checkout response");
  });

  it("tracks checkout start in sessionStorage to prevent duplicate opens", () => {
    const orderId = "order_123";
    const paymentSessionId = "session_abc123";

    expect(hasCashfreeCheckoutStarted(orderId, paymentSessionId)).toBe(false);
    markCashfreeCheckoutStarted(orderId, paymentSessionId);
    expect(hasCashfreeCheckoutStarted(orderId, paymentSessionId)).toBe(true);
    expect(cashfreeCheckoutStartedKey(orderId, paymentSessionId)).toContain(
      orderId,
    );
  });

  it("does not submit checkout twice for the same session", () => {
    const submitSpy = jest
      .spyOn(HTMLFormElement.prototype, "submit")
      .mockImplementation(() => undefined);

    const payload = {
      provider: "cashfree" as const,
      orderId: "order_123",
      paymentSessionId: "session_abc123",
      environment: "production" as const,
      returnUrl:
        "https://www.hub-of-craftss.hubofcraftss.workers.dev/api/cashfree/redirect?order_id={order_id}",
      checkoutOrigin: "https://www.hub-of-craftss.hubofcraftss.workers.dev",
    };

    openCashfreeCheckout({ payload });
    openCashfreeCheckout({ payload });

    expect(submitSpy).toHaveBeenCalledTimes(1);
    submitSpy.mockRestore();
  });
});
