import { getSessionUser, isAdminUser } from "@/lib/auth/admin";
import {
  logServerError,
  publicValidationPayload,
} from "@/lib/api/public-error";
import { resolveCourierTrackingUrl } from "@/lib/dispatch/courier-tracking-url";
import { sanitizeTrackingNumber } from "@/lib/dispatch/tracking-sanitizer";
import { notifyOrderDispatchEmail } from "@/lib/email/order-dispatch-email";
import db from "@/lib/supabase/db";
import {
  dispatchCouriers,
  orderDispatchEvents,
  orders,
} from "@/lib/supabase/schema";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const dispatchPayloadSchema = z.object({
  courierId: z.string().trim().min(1),
  trackingNumber: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value === "" ? null : value)),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const user = await getSessionUser();
  if (!user || !(await isAdminUser(user))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { orderId } = await context.params;
  const parsed = dispatchPayloadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (parsed.success === false) {
    return NextResponse.json(
      publicValidationPayload("Invalid dispatch payload", parsed.error),
      { status: 400 },
    );
  }
  const courier = await db.query.dispatchCouriers.findFirst({
    where: and(
      eq(dispatchCouriers.id, parsed.data.courierId),
      eq(dispatchCouriers.isActive, true),
    ),
  });
  if (!courier) {
    return NextResponse.json(
      { message: "Courier not found or inactive" },
      { status: 400 },
    );
  }
  let trackingNumber: string | null = null;
  try {
    trackingNumber = sanitizeTrackingNumber(parsed.data.trackingNumber);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Invalid tracking number.",
      },
      { status: 400 },
    );
  }
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });
  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }
  const paymentStatus = order.payment_status.trim().toLowerCase();
  if (!["paid", "success", "captured"].includes(paymentStatus)) {
    return NextResponse.json(
      { message: "Only paid orders can be dispatched" },
      { status: 409 },
    );
  }
  if ((order.order_status ?? "").trim().toLowerCase() !== "preparing") {
    return NextResponse.json(
      { message: "Dispatch is only available for preparing orders." },
      { status: 409 },
    );
  }

  const dispatchEventId = createId();
  const dispatchedAt = new Date().toISOString();
  try {
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(orders)
        .set({ order_status: "DISPATCHED" })
        .where(
          and(
            eq(orders.id, orderId),
            sql`lower(trim(${orders.order_status})) = 'preparing'`,
            sql`lower(trim(${orders.payment_status})) in ('paid','success','captured')`,
          ),
        )
        .returning({ id: orders.id });
      if (!updated) throw new Error("DISPATCH_GUARD_MISMATCH");
      await tx.insert(orderDispatchEvents).values({
        id: dispatchEventId,
        orderId,
        courierId: courier.id,
        courierName: courier.name,
        trackingUrlTemplate: courier.trackingUrlTemplate,
        trackingNumber,
        dispatchStatus: "DISPATCHED",
        dispatchedAt,
        createdBy: user.id,
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DISPATCH_GUARD_MISMATCH") {
      return NextResponse.json(
        { message: "Order is already dispatched or no longer preparing." },
        { status: 409 },
      );
    }
    logServerError("admin/orders/[orderId]/dispatch POST", error);
    return NextResponse.json(
      { message: "Dispatch failed. Please retry." },
      { status: 500 },
    );
  }

  const trackingUrl = resolveCourierTrackingUrl({
    trackingNumber,
    templateSnapshot: courier.trackingUrlTemplate,
  });
  try {
    await notifyOrderDispatchEmail(order, {
      courierName: courier.name,
      trackingNumber,
      trackingUrl,
      dispatchedAt,
    });
  } catch (error) {
    logServerError("admin/orders/[orderId]/dispatch email", error);
  }
  return NextResponse.json({
    ok: true,
    orderId,
    orderStatus: "DISPATCHED",
    dispatchEventId,
    courier: { id: courier.id, name: courier.name },
    trackingNumber,
    trackingUrl,
    dispatchedAt,
  });
}
