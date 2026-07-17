import db from "@/lib/supabase/db";
import { address, orders } from "@/lib/supabase/schema";
import { and, eq, isNull, lt, notExists, sql } from "drizzle-orm";

/**
 * Guest checkouts create address rows with no owner (`userProfileId` null).
 * Rows referenced by an order are kept forever (order pages display them);
 * the rest are abandoned checkout forms holding PII and are deleted after
 * this retention window.
 */
const ORPHAN_GUEST_ADDRESS_RETENTION_DAYS = 30;

export async function cleanupOrphanGuestAddresses(): Promise<{
  deletedGuestAddresses: number;
}> {
  const cutoffIso = new Date(
    Date.now() - ORPHAN_GUEST_ADDRESS_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const deleted = await db
    .delete(address)
    .where(
      and(
        isNull(address.userProfileId),
        lt(address.created_at, cutoffIso),
        notExists(
          db
            .select({ one: sql`1` })
            .from(orders)
            .where(eq(orders.addressId, address.id)),
        ),
      ),
    )
    .returning({ id: address.id });

  return { deletedGuestAddresses: deleted.length };
}
