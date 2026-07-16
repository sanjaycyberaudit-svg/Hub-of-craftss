import {
  cashfreeWebhookEventKey,
  phonePeWebhookEventKey,
  shortPayloadHash,
  stripeWebhookEventKey,
} from "./webhook-idempotency-keys";

describe("payment webhook event keys", () => {
  it("uses Stripe event id as-is", () => {
    expect(stripeWebhookEventKey(" evt_123 ")).toBe("evt_123");
  });

  it("keeps exact PhonePe retries identical and differs on payload change", () => {
    const merchantTransactionId = "ORD_abc";
    const bodyA = JSON.stringify({ response: "aaa", merchantTransactionId });
    const bodyB = JSON.stringify({ response: "bbb", merchantTransactionId });

    const keyA1 = phonePeWebhookEventKey({
      merchantTransactionId,
      rawBody: bodyA,
    });
    const keyA2 = phonePeWebhookEventKey({
      merchantTransactionId,
      rawBody: bodyA,
    });
    const keyB = phonePeWebhookEventKey({
      merchantTransactionId,
      rawBody: bodyB,
    });

    expect(keyA1).toBe(keyA2);
    expect(keyA1).not.toBe(keyB);
    expect(keyA1.startsWith("ORD_abc:")).toBe(true);
  });

  it("prefers Cashfree payment id so a second payment is a new key", () => {
    const orderId = "order_1";
    const rawBody = "{}";

    const first = cashfreeWebhookEventKey({
      orderId,
      webhookType: "PAYMENT_SUCCESS_WEBHOOK",
      paymentId: "pay_1",
      rawBody,
    });
    const retry = cashfreeWebhookEventKey({
      orderId,
      webhookType: "PAYMENT_SUCCESS_WEBHOOK",
      paymentId: "pay_1",
      rawBody,
    });
    const secondBuy = cashfreeWebhookEventKey({
      orderId,
      webhookType: "PAYMENT_SUCCESS_WEBHOOK",
      paymentId: "pay_2",
      rawBody,
    });

    expect(first).toBe(retry);
    expect(first).not.toBe(secondBuy);
  });

  it("hashes stable short digests", () => {
    expect(shortPayloadHash("hello")).toHaveLength(24);
    expect(shortPayloadHash("hello")).toBe(shortPayloadHash("hello"));
  });
});
