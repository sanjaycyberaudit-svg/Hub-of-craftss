import { resolveVeloOrderPushConfig } from "@/lib/integrations/settings";
import {
  buildVeloOrderPushPayload,
  type VeloOrderPushPayload,
} from "@/lib/integrations/velo-order-push-payload";
import { mergePaymentMeta, readPaymentMeta } from "@/lib/orders/payment-meta";
import { fetchWithTimeout } from "@/lib/network/fetchWithTimeout";
import db from "@/lib/supabase/db";
import { orderLines, orders, type SelectOrders } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";

export {
  DEFAULT_VELO_ORDER_PUSH_URL,
  buildVeloOrderPushPayload,
  type VeloOrderPushPayload,
} from "@/lib/integrations/velo-order-push-payload";

export type VeloOrderPushResult = {
  sent: boolean;
  skipped?: "not_configured" | "not_paid" | "already_notified" | "error";
  error?: string;
};

async function sumOrderLineQuantities(orderId: string): Promise<number[]> {
  const rows = await db
    .select({ quantity: orderLines.quantity })
    .from(orderLines)
    .where(eq(orderLines.orderId, orderId));

  return rows.map((row) => Number(row.quantity ?? 0));
}

/** Push a newly paid order to the Velo app (reads config from Supabase api_settings). */
export async function notifyVeloOrderPush(
  order: Pick<
    SelectOrders,
    "id" | "payment_status" | "name" | "payment_meta" | "createdAt"
  >,
): Promise<VeloOrderPushResult> {
  const config = await resolveVeloOrderPushConfig();
  if (!config) {
    return { sent: false, skipped: "not_configured" };
  }

  if (order.payment_status !== "paid") {
    return { sent: false, skipped: "not_paid" };
  }

  const meta = readPaymentMeta(order.payment_meta);
  if (meta.veloPushNotified === true) {
    return { sent: false, skipped: "already_notified" };
  }

  const payload = buildVeloOrderPushPayload({
    shopBaseUrl: config.shopBaseUrl,
    orderId: order.id,
    customerName: order.name,
    lineQuantities: await sumOrderLineQuantities(order.id),
    createdAt: order.createdAt,
  });

  try {
    const response = await fetchWithTimeout(config.pushUrl.replace(/\/$/, ""), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-velo-push-secret": config.pushSecret,
      },
      body: JSON.stringify(payload),
      timeoutMs: 10_000,
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Velo push HTTP ${response.status}${body ? `: ${body.slice(0, 240)}` : ""}`,
      );
    }

    await db
      .update(orders)
      .set({
        payment_meta: mergePaymentMeta(meta, {
          veloPushNotified: true,
          veloPushNotifiedAt: new Date().toISOString(),
          veloPushLastError: null,
        }),
      })
      .where(eq(orders.id, order.id));

    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Velo push failed";
    console.warn("[velo] order push failed:", message);

    await db
      .update(orders)
      .set({
        payment_meta: mergePaymentMeta(meta, {
          veloPushLastAttemptAt: new Date().toISOString(),
          veloPushLastError: message,
        }),
      })
      .where(eq(orders.id, order.id));

    return { sent: false, skipped: "error", error: message };
  }
}

/** Best-effort Velo push — never throws (safe inside payment webhooks). */
export async function notifyVeloOrderPushSafe(
  order: Pick<
    SelectOrders,
    "id" | "payment_status" | "name" | "payment_meta" | "createdAt"
  >,
) {
  try {
    return await notifyVeloOrderPush(order);
  } catch (error) {
    console.warn("[velo] order push unexpected failure:", error);
    return {
      sent: false,
      skipped: "error" as const,
      error: error instanceof Error ? error.message : "Velo push failed",
    };
  }
}
