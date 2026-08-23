import crypto from "crypto";
import {
  decideMissingCashfreeOrderId,
  extractCashfreeWebhookOrderId,
  extractCashfreeWebhookPaymentId,
  getCashfreeWebhookType,
  isCashfreeOrderLifecycleWebhook,
  parseCashfreeWebhookTimestampMs,
  resolveCashfreeWebhookSecrets,
} from "./cashfree-webhook";

describe("cashfree webhook helpers", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CASHFREE_WEBHOOK_SECRET;
    delete process.env.CASHFREE_CLIENT_SECRET;
  });

  it("extracts order_id from 2026 payment success shape", () => {
    const body = {
      type: "PAYMENT_SUCCESS_WEBHOOK",
      data: {
        order: { order_id: "hub_order_1", order_amount: 499 },
        payment: { cf_payment_id: "5114933189368", payment_status: "SUCCESS" },
      },
    };

    expect(extractCashfreeWebhookOrderId(body)).toBe("hub_order_1");
    expect(extractCashfreeWebhookPaymentId(body)).toBe("5114933189368");
    expect(getCashfreeWebhookType(body)).toBe("PAYMENT_SUCCESS_WEBHOOK");
  });

  it("coerces numeric order_id and finds nested fallbacks", () => {
    expect(
      extractCashfreeWebhookOrderId({
        data: { order_id: 12345 },
      }),
    ).toBe("12345");
    expect(
      extractCashfreeWebhookOrderId({
        data: { payment: { order_id: "pay_order" } },
      }),
    ).toBe("pay_order");
  });

  it("retries payment webhooks missing order_id; skips unrelated noise", () => {
    expect(isCashfreeOrderLifecycleWebhook("PAYMENT_FAILED_WEBHOOK")).toBe(
      true,
    );
    expect(decideMissingCashfreeOrderId("PAYMENT_SUCCESS_WEBHOOK")).toEqual({
      action: "retry",
      reason: "payment_webhook_missing_order_id",
    });
    expect(decideMissingCashfreeOrderId("SETTLEMENT_WEBHOOK")).toEqual({
      action: "skip",
      reason: "non_order_webhook",
    });
  });

  it("normalizes second and millisecond webhook timestamps", () => {
    expect(parseCashfreeWebhookTimestampMs("1746427759733")).toBe(
      1746427759733,
    );
    expect(parseCashfreeWebhookTimestampMs("1746427759")).toBe(1746427759000);
    expect(parseCashfreeWebhookTimestampMs("bad")).toBeNull();
  });

  it("prefers env webhook/client secrets then config secret", () => {
    process.env.CASHFREE_WEBHOOK_SECRET = "env_webhook";
    process.env.CASHFREE_CLIENT_SECRET = "env_client";
    expect(resolveCashfreeWebhookSecrets("admin_secret")).toEqual([
      "env_webhook",
      "env_client",
      "admin_secret",
    ]);
  });

  it("matches Cashfree HMAC sample construction", () => {
    const timestamp = "1746427759733";
    const rawBody = '{"type":"PAYMENT_SUCCESS_WEBHOOK"}';
    const secret = "test_client_secret";
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}${rawBody}`)
      .digest("base64");

    const actual = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}${rawBody}`)
      .digest("base64");
    expect(actual).toBe(expected);
  });
});
