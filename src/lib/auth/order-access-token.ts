import crypto from "crypto";

function getSigningSecret(): string {
  const secret =
    process.env.ORDER_ACCESS_SECRET?.trim() ||
    process.env.DATABASE_SERVICE_ROLE?.trim();

  if (!secret) {
    throw new Error("Missing order access signing secret");
  }

  return secret;
}

function normalizeCreatedAt(createdAt: string | Date): string {
  return new Date(createdAt).toISOString();
}

export function createOrderAccessToken(
  orderId: string,
  createdAt: string | Date,
): string {
  const payload = `${orderId}:${normalizeCreatedAt(createdAt)}`;
  return crypto
    .createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("base64url");
}

export function verifyOrderAccessToken(
  orderId: string,
  createdAt: string | Date,
  token: string | null | undefined,
): boolean {
  if (!token?.trim()) return false;

  try {
    const expected = createOrderAccessToken(orderId, createdAt);
    const provided = token.trim();
    if (expected.length !== provided.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

export function appendOrderAccessToken(
  path: string,
  orderId: string,
  createdAt: string | Date,
): string {
  const url = new URL(path, "http://local");
  url.searchParams.set("token", createOrderAccessToken(orderId, createdAt));
  return `${url.pathname}${url.search}`;
}

/**
 * After payment gateway return: only forward a token that was already issued at
 * checkout. Never mint a replacement token from orderId alone — that lets anyone
 * with a guessed/shared order id open guest PII.
 */
export function resolvePaymentReturnPath(input: {
  orderId: string;
  createdAt: string | Date;
  token: string | null | undefined;
  fallbackPath?: string;
}): string {
  const token = input.token?.trim() ?? "";
  if (verifyOrderAccessToken(input.orderId, input.createdAt, token)) {
    return `/orders/${input.orderId}?token=${encodeURIComponent(token)}`;
  }
  return input.fallbackPath ?? "/orders";
}
