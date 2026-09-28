import { siteConfig } from "@/config/site";
import { createOrderAccessToken } from "@/lib/auth/order-access-token";
import {
  buildOrderDispatchHtml,
  buildOrderDispatchPlainText,
  buildOrderDispatchSubject,
  type OrderDispatchEmailInput,
} from "./order-dispatch-content";
import { getResendConfig } from "./resend-config";
import { mergePaymentMeta, readPaymentMeta } from "@/lib/orders/payment-meta";
import {
  resolveOrderLineImageAlt,
  resolveOrderLineImageKey,
  resolveOrderLineProductCode,
  resolveOrderLineProductName,
} from "@/lib/orders/order-line-display";
import db from "@/lib/supabase/db";
import {
  address,
  orderLines,
  orders,
  type SelectOrders,
} from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { keytoUrl } from "@/lib/utils";

type DispatchDetails = {
  courierName: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  dispatchedAt: string;
};

export async function loadOrderDispatchInput(
  order: SelectOrders,
  dispatch: DispatchDetails,
): Promise<OrderDispatchEmailInput | null> {
  const email = order.email?.trim();
  if (!email) return null;
  const [addressRow] = await db
    .select({
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postal_code,
      country: address.country,
    })
    .from(orders)
    .leftJoin(address, eq(orders.addressId, address.id))
    .where(eq(orders.id, order.id))
    .limit(1);
  const lines = await db
    .select({
      productNameSnapshot: orderLines.productNameSnapshot,
      productCodeSnapshot: orderLines.productCodeSnapshot,
      productImageKeySnapshot: orderLines.productImageKeySnapshot,
      quantity: orderLines.quantity,
      price: orderLines.price,
    })
    .from(orderLines)
    .where(eq(orderLines.orderId, order.id));
  const token = createOrderAccessToken(order.id, order.createdAt);
  return {
    orderId: order.id,
    customerName: order.name,
    customerEmail: email,
    createdAt: order.createdAt,
    customerPhone: order.customer_mobile,
    lineItems: lines.map((line) => {
      const imageKey = resolveOrderLineImageKey(line);
      const imageUrl = keytoUrl(imageKey ?? undefined);
      return {
        name: resolveOrderLineProductName(line),
        quantity: line.quantity,
        unitPrice: Number(line.price),
        imageUrl: imageUrl.startsWith("/")
          ? `${siteConfig.url.replace(/\/$/, "")}${imageUrl}`
          : imageUrl,
        imageAlt: resolveOrderLineImageAlt(line),
        productCode: resolveOrderLineProductCode(line),
      };
    }),
    shippingAddress: addressRow ?? null,
    orderUrl: `${siteConfig.url.replace(/\/$/, "")}/orders/${order.id}?token=${encodeURIComponent(token)}`,
    ...dispatch,
  };
}

export async function notifyOrderDispatchEmail(
  order: SelectOrders,
  dispatch: DispatchDetails,
) {
  const config = getResendConfig();
  if (!config) return { sent: false, skipped: "not_configured" as const };
  const meta = readPaymentMeta(order.payment_meta);
  if (meta.dispatchEmailNotified === true) {
    return { sent: false, skipped: "already_notified" as const };
  }
  const input = await loadOrderDispatchInput(order, dispatch);
  if (!input) return { sent: false, skipped: "no_email" as const };
  try {
    const response = await new Resend(config.apiKey).emails.send({
      from: config.fromEmail,
      to: input.customerEmail,
      subject: buildOrderDispatchSubject(input.orderId),
      html: buildOrderDispatchHtml(input),
      text: buildOrderDispatchPlainText(input),
      replyTo: siteConfig.email || undefined,
    });
    if (response.error) throw new Error(response.error.message);
    await db
      .update(orders)
      .set({
        payment_meta: mergePaymentMeta(meta, {
          dispatchEmailNotified: true,
          dispatchEmailNotifiedAt: new Date().toISOString(),
          dispatchEmailLastError: null,
        }),
      })
      .where(eq(orders.id, order.id));
    return { sent: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Order dispatch email failed";
    await db
      .update(orders)
      .set({
        payment_meta: mergePaymentMeta(meta, {
          dispatchEmailLastAttemptAt: new Date().toISOString(),
          dispatchEmailLastError: message,
        }),
      })
      .where(eq(orders.id, order.id));
    return { sent: false, skipped: "error" as const, error: message };
  }
}
