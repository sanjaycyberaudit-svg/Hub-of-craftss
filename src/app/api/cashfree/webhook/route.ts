import { verifyCashfreeWebhookSignature } from "@/lib/payments/cashfree";
import {
  decideMissingCashfreeOrderId,
  extractCashfreeWebhookOrderId,
  extractCashfreeWebhookPaymentId,
  getCashfreeWebhookType,
} from "@/lib/payments/cashfree-webhook";
import { syncCashfreeOrderPayment } from "@/lib/payments/orderPaymentSync";
import {
  cashfreeWebhookEventKey,
  withPaymentWebhookIdempotency,
} from "@/lib/payments/webhook-idempotency";
import { NextRequest, NextResponse } from "next/server";

function isOrderNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /order not found/i.test(message);
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-webhook-signature")?.trim() ?? "";
  const timestamp = request.headers.get("x-webhook-timestamp")?.trim() ?? "";
  const idempotencyKey =
    request.headers.get("x-idempotency-key")?.trim() ?? "";
  const webhookVersion =
    request.headers.get("x-webhook-version")?.trim() ?? "";

  if (!signature || !timestamp) {
    return NextResponse.json(
      { ok: false, message: "Missing webhook signature headers" },
      { status: 400 },
    );
  }

  // Docs list x-webhook-version as mandatory; accept older deliveries but log.
  if (!webhookVersion) {
    console.warn("[cashfree] webhook missing x-webhook-version header");
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

  const webhookType = getCashfreeWebhookType(body);
  const orderId = extractCashfreeWebhookOrderId(body);

  if (!orderId) {
    const decision = decideMissingCashfreeOrderId(webhookType);
    if (decision.action === "retry") {
      console.error(
        "[cashfree] payment webhook missing order_id — requesting retry",
        { webhookType },
      );
      return NextResponse.json(
        { ok: false, retry: true, reason: decision.reason, webhookType },
        { status: 422 },
      );
    }
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: decision.reason,
      webhookType,
    });
  }

  const paymentId = extractCashfreeWebhookPaymentId(body);
  const eventId = cashfreeWebhookEventKey({
    orderId,
    webhookType,
    paymentId: paymentId || null,
    rawBody,
    idempotencyKey: idempotencyKey || null,
  });

  try {
    const outcome = await withPaymentWebhookIdempotency({
      provider: "cashfree",
      eventId,
      orderId,
      // Webhook is authoritative for inventory/WhatsApp; always await effects.
      handler: async () =>
        syncCashfreeOrderPayment(orderId, { runSideEffects: true }),
    });

    if (outcome.status === "skipped") {
      // Another delivery is mid-flight. If it crashes, a 200 here would end
      // gateway retries and the order could stay unpaid forever — ask the
      // gateway to retry instead; the duplicate resolves to 200 once done.
      if (outcome.reason === "in_progress") {
        return NextResponse.json(
          { ok: false, retry: true, reason: outcome.reason },
          { status: 503 },
        );
      }
      return NextResponse.json({
        ok: true,
        duplicate: true,
        reason: outcome.reason,
      });
    }

    return NextResponse.json({ ok: true, ...outcome.result });
  } catch (error) {
    // Unknown merchant order_id cannot be fixed by retries — ack to stop loops.
    if (isOrderNotFoundError(error)) {
      console.error("[cashfree] webhook for unknown order:", orderId);
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "order_not_found",
        orderId,
      });
    }
    console.error("[cashfree] webhook sync failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
