import crypto from "crypto";

import { getSessionUser, isAdminUser } from "@/lib/auth/admin";

function getSigningSecret(): string {
  const secret =
    process.env.ORDER_ACCESS_SECRET?.trim() ||
    process.env.DATABASE_SERVICE_ROLE?.trim() ||
    process.env.STRIPE_SECRET_KEY?.trim();

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

type OrderAccessRecord = {
  id: string;
  user_id: string | null;
  createdAt: string | Date;
};

export async function canViewOrder(
  order: OrderAccessRecord,
  token?: string | null,
): Promise<boolean> {
  const user = await getSessionUser();

  if (order.user_id) {
    if (user?.id === order.user_id) return true;
    return isAdminUser(user);
  }

  return verifyOrderAccessToken(order.id, order.createdAt, token);
}
