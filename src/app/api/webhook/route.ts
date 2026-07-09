import { env } from "@/env.mjs";
import { notifyVeloOrderPushSafe } from "@/lib/integrations/velo-order-push";
import { notifyOrderWhatsAppTargets } from "@/lib/integrations/whatsapp";
import { fulfillPaidOrderInventory } from "@/lib/orders/inventory-fulfillment";
import { mergePaymentMeta, readPaymentMeta } from "@/lib/orders/payment-meta";
import { releaseStockReservation } from "@/lib/orders/stock-reservation";
import { stripe } from "@/lib/stripe";
import db from "@/lib/supabase/db";
import { carts, PaymentStatus, orders } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const relevantEvents = new Set([
  "product.created",
  "product.updated",
  "price.created",
  "price.updated",
  "payment_intent.succeeded",
  "checkout.session.completed",
]);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = headers().get("Stripe-Signature");

  const webhookSecret = env.STRIPE_WEBHOOK_SECERT_KEY;

  let event: Stripe.Event;
  try {
    if (!sig || !webhookSecret) {
      return new NextResponse("Missing Stripe signature or webhook secret", {
        status: 400,
      });
    }
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: unknown) {
    console.error("[stripe/webhook] signature verification failed:", err);
    return new NextResponse("Webhook signature verification failed.", {
      status: 400,
    });
  }
  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case "product.created":
          break;
        case "payment_intent.succeeded":
          // TODO:Update the Order payment Status

          break;
        case "checkout.session.completed":
          const checkoutSession = event.data.object as Stripe.Checkout.Session;
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

          if (checkoutSession.status === "complete") {
            const customer_details = checkoutSession.customer_details;
            const existingOrder = await db.query.orders.findFirst({
              where: eq(orders.id, checkoutSession.client_reference_id ?? ""),
            });
            const existingMeta = readPaymentMeta(existingOrder?.payment_meta);

            const updatedOrder = await db
              .update(orders)
              .set({
                amount: `${checkoutSession.amount_total / 100}`,
                email: customer_details!.email,
                name: customer_details!.name,
                order_status: "PREPARING",
                stripe_payment_intent_id: paymentIntentId,
                payment_status: checkoutSession.payment_status as PaymentStatus,
                payment_method: checkoutSession.payment_method_types[0],
                payment_provider: "stripe",
                payment_reference: paymentIntentId,
                customer_mobile: customerMobile || null,
                addressId: shippingAddressId || null,
                payment_meta: mergePaymentMeta(existingMeta, {
                  stripeSessionId: checkoutSession.id,
                }),
              })
              .where(eq(orders.id, checkoutSession.client_reference_id))
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
          } else {
            await db
              .update(orders)
              .set({
                order_status: "canceled",
                stripe_payment_intent_id: paymentIntentId,
                payment_status: checkoutSession.payment_status as PaymentStatus,
                payment_provider: "stripe",
              })
              .where(eq(orders.id, checkoutSession.client_reference_id));

            if (checkoutSession.client_reference_id) {
              await releaseStockReservation(
                checkoutSession.client_reference_id,
                "payment_canceled",
              ).catch((error) => {
                console.warn("[stripe/webhook] stock release skipped:", error);
              });
            }
          }
          break;
        default:
          throw new Error("Unhandled relevant event!");
      }
    } catch (error) {
      console.log(error);
      return new NextResponse(
        'Webhook error: "Webhook handler failed. View logs."',
        { status: 400 },
      );
    }
  }
  return NextResponse.json({ received: true }, { status: 200 });
}
