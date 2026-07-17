import {
  createOrderAccessToken,
  resolvePaymentReturnPath,
  verifyOrderAccessToken,
} from "./order-access-token";

describe("order access tokens", () => {
  const orderId = "ord_guest_abc123";
  const createdAt = "2026-07-17T10:00:00.000Z";
  const previousSecret = process.env.ORDER_ACCESS_SECRET;
  const previousDbSecret = process.env.DATABASE_SERVICE_ROLE;

  beforeAll(() => {
    process.env.ORDER_ACCESS_SECRET = "test-order-access-secret";
    delete process.env.DATABASE_SERVICE_ROLE;
  });

  afterAll(() => {
    process.env.ORDER_ACCESS_SECRET = previousSecret;
    process.env.DATABASE_SERVICE_ROLE = previousDbSecret;
  });

  it("creates and verifies a checkout-issued token", () => {
    const token = createOrderAccessToken(orderId, createdAt);
    expect(verifyOrderAccessToken(orderId, createdAt, token)).toBe(true);
  });

  it("rejects missing, tampered, and cross-order tokens", () => {
    const token = createOrderAccessToken(orderId, createdAt);
    expect(verifyOrderAccessToken(orderId, createdAt, null)).toBe(false);
    expect(verifyOrderAccessToken(orderId, createdAt, "")).toBe(false);
    expect(verifyOrderAccessToken(orderId, createdAt, `${token}x`)).toBe(false);
    expect(verifyOrderAccessToken("ord_other", createdAt, token)).toBe(false);
  });

  it("still verifies tokens signed with the fallback secret after rotation", () => {
    // Simulate the pre-rotation world: only DATABASE_SERVICE_ROLE existed.
    delete process.env.ORDER_ACCESS_SECRET;
    process.env.DATABASE_SERVICE_ROLE = "legacy-db-secret";
    const legacyToken = createOrderAccessToken(orderId, createdAt);

    // Rotate: dedicated secret becomes primary, old secret stays as fallback.
    process.env.ORDER_ACCESS_SECRET = "new-dedicated-secret";
    expect(verifyOrderAccessToken(orderId, createdAt, legacyToken)).toBe(true);

    const newToken = createOrderAccessToken(orderId, createdAt);
    expect(newToken).not.toBe(legacyToken);
    expect(verifyOrderAccessToken(orderId, createdAt, newToken)).toBe(true);

    // Restore the suite's env expectations.
    process.env.ORDER_ACCESS_SECRET = "test-order-access-secret";
    delete process.env.DATABASE_SERVICE_ROLE;
  });

  it("resolves payment return path only when token is valid", () => {
    const token = createOrderAccessToken(orderId, createdAt);
    expect(
      resolvePaymentReturnPath({
        orderId,
        createdAt,
        token,
      }),
    ).toBe(`/orders/${orderId}?token=${encodeURIComponent(token)}`);

    expect(
      resolvePaymentReturnPath({
        orderId,
        createdAt,
        token: null,
      }),
    ).toBe("/orders");

    expect(
      resolvePaymentReturnPath({
        orderId,
        createdAt,
        token: "forged",
      }),
    ).toBe("/orders");
  });
});
