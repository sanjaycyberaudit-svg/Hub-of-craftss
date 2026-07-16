import { env } from "@/env.mjs";
import { notifyVeloOrderPushSafe } from "@/lib/integrations/velo-order-push";
import { notifyOrderWhatsAppTargets } from "@/lib/integrations/whatsapp";
import { fulfillPaidOrderInventory } from "@/lib/orders/inventory-fulfillment";
import { mergePaymentMeta, readPaymentMeta } from "@/lib/orders/payment-meta";
import { releaseStockReservation } from "@/lib/orders/stock-reservation";
import {
  stripeWebhookEventKey,
  withPaymentWebhookIdempotency,
} from "@/lib/payments/webhook-idempotency";
import { getStripe } from "@/lib/stripe";
import db from "@/lib/supabase/db";
import { carts, PaymentStatus, orders } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

const relevantEvents = new Set([
  "product.created",
  "product.updated",
  "price.created",
  "price.updated",
  "payment_intent.succeeded",
  "checkout.session.completed",
]);

async function handleCheckoutSessionCompleted(
  checkoutSession: Stripe.Checkout.Session,
) {
  const customerMobile = String(
    checkoutSession.metadata?.customer_mobile ?? "",
  ).trim();
  const shippingAddressId = String(
    checkoutSession.metadata?.shipping_address_id ?? "",
  ).trim();
  const paymentIntentId =
    typeof checkoutSession.payment_intent === "string"
      ? checkoutSession.payment_intent
      : null;
  const orderId = checkoutSession.client_reference_id ?? "";

  if (!orderId) {
    return { orderId: null as string | null };
  }

  if (checkoutSession.status === "complete") {
    const existingOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    // Same Stripe payment already applied — skip side effects on retry.
    if (
      existingOrder?.payment_status === "paid" &&
      (existingOrder.stripe_payment_intent_id === paymentIntentId ||
        existingOrder.payment_reference === paymentIntentId ||
        existingOrder.payment_reference === checkoutSession.id)
    ) {
      return { orderId: existingOrder.id, alreadyPaid: true as const };
    }

    const customer_details = checkoutSession.customer_details;
    const existingMeta = readPaymentMeta(existingOrder?.payment_meta);

    const updatedOrder = await db
      .update(orders)
      .set({
        amount: `${(checkoutSession.amount_total ?? 0) / 100}`,
        email: customer_details?.email ?? existingOrder?.email ?? null,
        name: customer_details?.name ?? existingOrder?.name ?? null,
        order_status: "PREPARING",
        stripe_payment_intent_id: paymentIntentId,
        payment_status: checkoutSession.payment_status as PaymentStatus,
        payment_method: checkoutSession.payment_method_types?.[0] ?? "card",
        payment_provider: "stripe",
        payment_reference: paymentIntentId,
        customer_mobile: customerMobile || null,
        addressId: shippingAddressId || null,
        payment_meta: mergePaymentMeta(existingMeta, {
          stripeSessionId: checkoutSession.id,
        }),
      })
      .where(eq(orders.id, orderId))
      .returning();

    const order = updatedOrder[0];
    if (order?.payment_status === "paid") {
      const wa = await notifyOrderWhatsAppTargets(order);
      if (wa.customerNotified || wa.sellerNotified) {
        await db
          .update(orders)
          .set({
            whatsapp_notified: wa.customerNotified
              ? true
              : order.whatsapp_notified,
            whatsapp_notified_at: wa.customerNotified
              ? new Date().toISOString()
              : order.whatsapp_notified_at,
            whatsapp_seller_notified: wa.sellerNotified
              ? true
              : order.whatsapp_seller_notified,
            whatsapp_seller_notified_at: wa.sellerNotified
              ? new Date().toISOString()
              : order.whatsapp_seller_notified_at,
          })
          .where(eq(orders.id, order.id));
      }

      if (order.user_id) {
        await db.delete(carts).where(eq(carts.userId, order.user_id));
      }

      await fulfillPaidOrderInventory(order.id);
      await notifyVeloOrderPushSafe(order);
    }

    return { orderId: order?.id ?? orderId };
  }

  await db
    .update(orders)
    .set({
      order_status: "canceled",
      stripe_payment_intent_id: paymentIntentId,
      payment_status: checkoutSession.payment_status as PaymentStatus,
      payment_provider: "stripe",
    })
    .where(eq(orders.id, orderId));

  await releaseStockReservation(orderId, "payment_canceled").catch((error) => {
    console.warn("[stripe/webhook] stock release skipped:", error);
  });

  return { orderId };
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = (await headers()).get("Stripe-Signature");

  const webhookSecret = env.STRIPE_WEBHOOK_SECERT_KEY;

  let event: Stripe.Event;
  try {
    if (!sig || !webhookSecret) {
      return new NextResponse("Missing Stripe signature or webhook secret", {
        status: 400,
      });
    }
    const stripe = await getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: unknown) {
    console.error("[stripe/webhook] signature verification failed:", err);
    return new NextResponse("Webhook signature verification failed.", {
      status: 400,
    });
  }

  if (!relevantEvents.has(event.type)) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const orderIdHint =
    event.type === "checkout.session.completed"
      ? String(
          (event.data.object as Stripe.Checkout.Session).client_reference_id ??
            "",
        ).trim() || null
      : null;

  try {
    const outcome = await withPaymentWebhookIdempotency({
      provider: "stripe",
      eventId: stripeWebhookEventKey(event.id),
      orderId: orderIdHint,
      handler: async () => {
        switch (event.type) {
          case "product.created":
          case "product.updated":
          case "price.created":
          case "price.updated":
          case "payment_intent.succeeded":
            return { skipped: true as const };
          case "checkout.session.completed":
            return handleCheckoutSessionCompleted(
              event.data.object as Stripe.Checkout.Session,
            );
          default:
            throw new Error(`Unhandled relevant event: ${event.type}`);
        }
      },
    });

    if (outcome.status === "skipped") {
      return NextResponse.json(
        { received: true, duplicate: true, reason: outcome.reason },
        { status: 200 },
      );
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[stripe/webhook] handler failed:", error);
    return new NextResponse(
      'Webhook error: "Webhook handler failed. View logs."',
      { status: 400 },
    );
  }
}
