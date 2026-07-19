import crypto from "crypto";

/**
 * Signing secrets, primary first. New tokens are always signed with the
 * primary (dedicated ORDER_ACCESS_SECRET when set); verification accepts any
 * listed secret so tokens issued before a secret rotation — e.g. links
 * already delivered to guests over WhatsApp — keep working.
 */
function getSigningSecrets(): string[] {
  const secrets = [
    process.env.ORDER_ACCESS_SECRET?.trim(),
    process.env.DATABASE_SERVICE_ROLE?.trim(),
  ].filter((secret): secret is string => Boolean(secret));

  if (secrets.length === 0) {
    throw new Error("Missing order access signing secret");
  }

  return secrets;
}

function normalizeCreatedAt(createdAt: string | Date): string {
  return new Date(createdAt).toISOString();
}

function signOrderAccessToken(
  orderId: string,
  createdAt: string | Date,
  secret: string,
): string {
  const payload = `${orderId}:${normalizeCreatedAt(createdAt)}`;
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
}

export function createOrderAccessToken(
  orderId: string,
  createdAt: string | Date,
): string {
  return signOrderAccessToken(orderId, createdAt, getSigningSecrets()[0]);
}

export function verifyOrderAccessToken(
  orderId: string,
  createdAt: string | Date,
  token: string | null | undefined,
): boolean {
  const provided = token?.trim();
  if (!provided) return false;

  try {
    for (const secret of getSigningSecrets()) {
      const expected = signOrderAccessToken(orderId, createdAt, secret);
      if (
        expected.length === provided.length &&
        crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
      ) {
        return true;
      }
    }
    return false;
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
