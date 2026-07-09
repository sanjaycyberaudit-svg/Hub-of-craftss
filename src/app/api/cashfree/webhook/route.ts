import { verifyCashfreeWebhookSignature } from "@/lib/payments/cashfree";
import { syncCashfreeOrderPayment } from "@/lib/payments/orderPaymentSync";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-webhook-signature")?.trim() ?? "";
  const timestamp = request.headers.get("x-webhook-timestamp")?.trim() ?? "";
  if (!signature || !timestamp) {
    return NextResponse.json(
      { ok: false, message: "Missing webhook signature headers" },
      { status: 400 },
    );
  }

  const rawBody = await request.text();
  const isVerified = await verifyCashfreeWebhookSignature({
    rawBody,
    timestamp,
    signature,
  }).catch(() => false);

  if (!isVerified) {
    return NextResponse.json(
      { ok: false, message: "Invalid webhook signature" },
      { status: 401 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(rawBody || "{}") as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const rawData = body?.data as Record<string, unknown> | undefined;
  const orderEntity = rawData?.order as Record<string, unknown> | undefined;
  const orderId = String(
    (orderEntity?.order_id as string) ||
      (rawData?.order_id as string) ||
      (body?.order_id as string) ||
      "",
  ).trim();

  if (!orderId) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    await syncCashfreeOrderPayment(orderId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[cashfree] webhook sync failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
