import { verifyPhonePeWebhookSignature } from "@/lib/payments/phonepe";
import { getPhonePeConfig } from "@/lib/integrations/settings";
import { syncPhonePeOrderPayment } from "@/lib/payments/orderPaymentSync";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!rawBody.trim()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const config = await getPhonePeConfig();
  if (!config) {
    return NextResponse.json(
      { ok: false, message: "PhonePe is not configured" },
      { status: 503 },
    );
  }

  const signature = request.headers.get("x-verify")?.trim() ?? "";

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const responseEnvelope = String((body?.response as string) || "").trim();
  if (!responseEnvelope) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const isVerified = verifyPhonePeWebhookSignature({
    base64Response: responseEnvelope,
    signature,
    saltKey: config.saltKey,
    saltIndex: config.saltIndex,
  });

  if (!isVerified) {
    return NextResponse.json(
      { ok: false, message: "Invalid webhook signature" },
      { status: 401 },
    );
  }

  let decoded: Record<string, unknown> = {};
  try {
    decoded = JSON.parse(
      Buffer.from(responseEnvelope, "base64").toString("utf8"),
    ) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid callback payload" },
      { status: 400 },
    );
  }

  const merchantTransactionId = String(
    (body?.merchantTransactionId as string) ||
      (body?.merchantOrderId as string) ||
      (decoded?.merchantTransactionId as string) ||
      ((decoded?.data as Record<string, unknown> | undefined)
        ?.merchantTransactionId as string) ||
      (body?.transactionId as string) ||
      "",
  ).trim();

  if (!merchantTransactionId) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  if (!merchantTransactionId.startsWith("ORD_")) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    await syncPhonePeOrderPayment({
      merchantTransactionId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[phonepe] webhook sync failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
