import {
  appendOrderAccessToken,
  verifyOrderAccessToken,
} from "@/lib/auth/order-access";
import { syncPhonePeOrderPayment } from "@/lib/payments/orderPaymentSync";
import db from "@/lib/supabase/db";
import { orders } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId")?.trim() ?? "";
  const token = request.nextUrl.searchParams.get("token");
  const merchantTransactionId =
    request.nextUrl.searchParams.get("merchantTransactionId") ||
    request.nextUrl.searchParams.get("transactionId");

  if (!orderId && !merchantTransactionId) {
    return NextResponse.redirect(new URL("/orders", request.url));
  }

  let resolvedOrderId = orderId;

  try {
    const syncResult = await syncPhonePeOrderPayment({
      orderId: orderId || undefined,
      merchantTransactionId: merchantTransactionId ?? undefined,
    });
    resolvedOrderId = syncResult.orderId;
  } catch (error) {
    console.error("[phonepe] redirect sync failed:", error);
    if (!resolvedOrderId) {
      return NextResponse.redirect(new URL("/orders", request.url));
    }
  }

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, resolvedOrderId),
  });

  if (!order) {
    return NextResponse.redirect(new URL("/orders", request.url));
  }

  const redirectPath = verifyOrderAccessToken(order.id, order.createdAt, token)
    ? `/orders/${resolvedOrderId}?token=${encodeURIComponent(token!.trim())}`
    : appendOrderAccessToken(
        `/orders/${resolvedOrderId}`,
        order.id,
        order.createdAt,
      );

  return NextResponse.redirect(new URL(redirectPath, request.url));
}
