import {
  appendOrderAccessToken,
  verifyOrderAccessToken,
} from "@/lib/auth/order-access";
import { syncCashfreeOrderPayment } from "@/lib/payments/orderPaymentSync";
import db from "@/lib/supabase/db";
import { orders } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("order_id")?.trim() ?? "";
  const token = request.nextUrl.searchParams.get("token");

  if (!orderId) {
    return NextResponse.redirect(new URL("/orders", request.url));
  }

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    return NextResponse.redirect(new URL("/orders", request.url));
  }

  try {
    await syncCashfreeOrderPayment(orderId);
  } catch (error) {
    console.error("[cashfree] redirect sync failed:", error);
  }

  const redirectPath = verifyOrderAccessToken(order.id, order.createdAt, token)
    ? `/orders/${orderId}?token=${encodeURIComponent(token!.trim())}`
    : appendOrderAccessToken(`/orders/${orderId}`, order.id, order.createdAt);

  return NextResponse.redirect(new URL(redirectPath, request.url));
}
