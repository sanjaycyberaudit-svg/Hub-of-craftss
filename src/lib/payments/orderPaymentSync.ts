import db from "@/lib/supabase/db";
import { carts, orders } from "@/lib/supabase/schema";
import { notifyVeloOrderPushSafe } from "@/lib/integrations/velo-order-push";
import { notifyOrderWhatsAppTargets } from "@/lib/integrations/whatsapp";
import { fetchPhonePePaymentStatus } from "@/lib/payments/phonepe";
import { fetchCashfreeOrderStatus } from "@/lib/payments/cashfree";
import { fulfillPaidOrderInventory } from "@/lib/orders/inventory-fulfillment";
import { mergePaymentMeta, readPaymentMeta } from "@/lib/orders/payment-meta";
import {
  canReleaseOrphanUnpaidHold,
  isReservationExpired,
  releaseStockReservation,
  hasActiveStockReservation,
} from "@/lib/orders/stock-reservation";
import { eq } from "drizzle-orm";

type SyncInput =
  | { orderId: string; merchantTransactionId?: string | null }
  | { orderId?: string | null; merchantTransactionId: string };

async function maybeReleaseUnpaidReservation(orderId: string, reason: string) {
  await releaseStockReservation(orderId, reason, {
    allowOrphanFallback: true,
  }).catch((error) => {
    console.warn("[payments] stock release skipped:", error);
  });
}

async function maybeReleaseExpiredReservation(orderId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });
  if (!order || order.payment_status === "paid") return;

  const meta = readPaymentMeta(order.payment_meta);
  const shouldReleaseTracked =
    hasActiveStockReservation(meta) && isReservationExpired(meta);
  const shouldReleaseOrphan = canReleaseOrphanUnpaidHold(
    meta,
    order.createdAt,
    "reservation_expired",
  );

  if (shouldReleaseTracked || shouldReleaseOrphan) {
    await maybeReleaseUnpaidReservation(orderId, "reservation_expired");
  }
}

export async function syncPhonePeOrderPayment(input: SyncInput) {
  const currentOrder = input.orderId
    ? await db.query.orders.findFirst({
        where: eq(orders.id, input.orderId),
      })
    : await db.query.orders.findFirst({
        where: eq(
          orders.phonepe_merchant_transaction_id,
          input.merchantTransactionId,
        ),
      });

  if (!currentOrder) {
    throw new Error("Order not found for payment sync");
  }

  const merchantTransactionId =
    currentOrder.phonepe_merchant_transaction_id ??
    input.merchantTransactionId ??
    "";

  if (!merchantTransactionId) {
    throw new Error("merchantTransactionId missing for PhonePe status sync");
  }

  // Already paid for this merchant txn — allow gateway retries without
  // re-running WhatsApp / cart clear / inventory side effects.
  if (
    currentOrder.payment_status === "paid" &&
    (currentOrder.phonepe_merchant_transaction_id === merchantTransactionId ||
      currentOrder.payment_reference === merchantTransactionId ||
      currentOrder.phonepe_transaction_id)
  ) {
    return {
      orderId: currentOrder.id,
      state: "COMPLETED",
      isPaid: true,
      alreadyPaid: true as const,
    };
  }

  const status = await fetchPhonePePaymentStatus(merchantTransactionId);
  const state = status?.state ?? "PENDING";
  const isPaid = state === "COMPLETED";
  const isFailed = state === "FAILED";
  const existingMeta = readPaymentMeta(currentOrder.payment_meta);

  const [updated] = await db
    .update(orders)
    .set({
      order_status: isPaid ? "PREPARING" : isFailed ? "canceled" : "pending",
      payment_status: isPaid ? "paid" : "unpaid",
      payment_method: "phonepe",
      payment_provider: "phonepe",
      payment_reference: status?.transactionId ?? merchantTransactionId,
      phonepe_transaction_id: status?.transactionId ?? null,
      phonepe_merchant_transaction_id: merchantTransactionId,
      payment_meta: mergePaymentMeta(existingMeta, {
        phonepeState: state,
        responseCode: status?.responseCode ?? null,
        paymentInstrument: status?.paymentInstrument ?? null,
      }),
    })
    .where(eq(orders.id, currentOrder.id))
    .returning();

  if (isPaid) {
    const wa = await notifyOrderWhatsAppTargets(updated);
    if (wa.customerNotified || wa.sellerNotified) {
      await db
        .update(orders)
        .set({
          whatsapp_notified: wa.customerNotified
            ? true
            : updated.whatsapp_notified,
          whatsapp_notified_at: wa.customerNotified
            ? new Date().toISOString()
            : updated.whatsapp_notified_at,
          whatsapp_seller_notified: wa.sellerNotified
            ? true
            : updated.whatsapp_seller_notified,
          whatsapp_seller_notified_at: wa.sellerNotified
            ? new Date().toISOString()
            : updated.whatsapp_seller_notified_at,
        })
        .where(eq(orders.id, updated.id));
    }

    if (updated.user_id) {
      await db.delete(carts).where(eq(carts.userId, updated.user_id));
    }

    await fulfillPaidOrderInventory(updated.id);
    await notifyVeloOrderPushSafe(updated);
  } else if (isFailed) {
    await maybeReleaseUnpaidReservation(updated.id, "payment_failed");
  } else {
    await maybeReleaseExpiredReservation(updated.id);
  }

  return {
    orderId: updated.id,
    state,
    isPaid,
  };
}

export async function syncCashfreeOrderPayment(orderId: string) {
  const currentOrder = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!currentOrder) {
    throw new Error("Order not found for Cashfree payment sync");
  }

  if (currentOrder.payment_status === "paid") {
    return {
      orderId: currentOrder.id,
      state: "PAID",
      isPaid: true,
      alreadyPaid: true as const,
    };
  }

  const status = await fetchCashfreeOrderStatus(orderId);
  const state = String(status.order_status ?? "ACTIVE").toUpperCase();
  const isPaid = state === "PAID";
  const isTerminalFailure = ["EXPIRED", "TERMINATED", "CANCELLED"].includes(
    state,
  );
  const existingMeta = readPaymentMeta(currentOrder.payment_meta);

  const [updated] = await db
    .update(orders)
    .set({
      order_status: isPaid
        ? "PREPARING"
        : isTerminalFailure
          ? "canceled"
          : "pending",
      payment_status: isPaid ? "paid" : "unpaid",
      payment_method: "cashfree",
      payment_provider: "cashfree",
      payment_reference: status.cf_order_id
        ? String(status.cf_order_id)
        : orderId,
      payment_meta: mergePaymentMeta(existingMeta, {
        cashfreeOrderId: status.order_id ?? orderId,
        cashfreeCfOrderId: status.cf_order_id
          ? String(status.cf_order_id)
          : null,
        cashfreeOrderStatus: state,
      }),
    })
    .where(eq(orders.id, currentOrder.id))
    .returning();

  if (isPaid) {
    const wa = await notifyOrderWhatsAppTargets(updated);
    if (wa.customerNotified || wa.sellerNotified) {
      await db
        .update(orders)
        .set({
          whatsapp_notified: wa.customerNotified
            ? true
            : updated.whatsapp_notified,
          whatsapp_notified_at: wa.customerNotified
            ? new Date().toISOString()
            : updated.whatsapp_notified_at,
          whatsapp_seller_notified: wa.sellerNotified
            ? true
            : updated.whatsapp_seller_notified,
          whatsapp_seller_notified_at: wa.sellerNotified
            ? new Date().toISOString()
            : updated.whatsapp_seller_notified_at,
        })
        .where(eq(orders.id, updated.id));
    }

    if (updated.user_id) {
      await db.delete(carts).where(eq(carts.userId, updated.user_id));
    }

    await fulfillPaidOrderInventory(updated.id);
    await notifyVeloOrderPushSafe(updated);
  } else if (isTerminalFailure) {
    await maybeReleaseUnpaidReservation(updated.id, "payment_failed");
  } else {
    await maybeReleaseExpiredReservation(updated.id);
  }

  return {
    orderId: updated.id,
    state,
    isPaid,
  };
}
