import db from "@/lib/supabase/db";
import { orders } from "@/lib/supabase/schema";
import { and, eq, sql } from "drizzle-orm";

/**
 * Orders that use up a first-order offer: real purchases that were not cancelled.
 * Abandoned unpaid attempts must not burn the welcome discount.
 */
export async function countCompletedOrdersForUser(
  userId: string,
): Promise<number> {
  const paymentStatus = sql`lower(trim(coalesce(${orders.payment_status}, '')))`;
  const orderStatus = sql`lower(trim(coalesce(${orders.order_status}, '')))`;

  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        eq(orders.user_id, userId),
        sql`${paymentStatus} in ('paid', 'success', 'captured', 'no_payment_required')`,
        sql`${orderStatus} not in ('cancelled', 'canceled')`,
      ),
    );

  return Number(row?.total ?? 0);
}

export async function isFirstOrderForUser(userId: string): Promise<boolean> {
  return (await countCompletedOrdersForUser(userId)) === 0;
}
