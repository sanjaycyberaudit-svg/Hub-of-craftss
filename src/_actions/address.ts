"use server";

import db from "@/lib/supabase/db";
import { getSessionUser } from "@/lib/auth/admin";
import { address } from "@/lib/supabase/schema";
import type { AddressFormValues } from "@/features/addresses/validations/addressFormSchema";
import type { UserAddressRecord } from "@/features/addresses/lib/userAddress";
import { and, desc, eq } from "drizzle-orm";

function mapAddressRow(row: typeof address.$inferSelect): UserAddressRecord {
  return {
    addressId: row.id,
    fullName: row.full_name ?? "",
    email: row.email ?? "",
    mobile: row.mobile ?? "",
    line1: row.line1 ?? "",
    line2: row.line2 ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    postal_code: row.postal_code ?? "",
    country: row.country ?? "IN",
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

function toSavedShippingAddress(
  record: UserAddressRecord,
): AddressFormValues & { addressId: string } {
  return {
    addressId: record.addressId,
    fullName: record.fullName,
    email: record.email,
    mobile: record.mobile,
    line1: record.line1,
    line2: record.line2,
    city: record.city,
    state: record.state,
    postal_code: record.postal_code,
  };
}

async function requireUserId(expectedUserId?: string | null) {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Please sign in to manage your addresses.");
  }
  if (expectedUserId && expectedUserId !== user.id) {
    throw new Error("You can only manage your own addresses.");
  }
  return user.id;
}

async function clearDefaultForUser(userId: string) {
  await db
    .update(address)
    .set({ is_default: false })
    .where(eq(address.userProfileId, userId));
}

export async function listUserAddresses(): Promise<UserAddressRecord[]> {
  const userId = await requireUserId();
  const rows = await db
    .select()
    .from(address)
    .where(eq(address.userProfileId, userId))
    .orderBy(desc(address.is_default), desc(address.created_at));

  return rows.map(mapAddressRow);
}

export async function createShippingAddress(
  data: AddressFormValues,
  userId?: string | null,
  options?: { setAsDefault?: boolean },
) {
  let resolvedUserId = userId;
  if (resolvedUserId === undefined) {
    const user = await getSessionUser();
    resolvedUserId = user?.id ?? null;
  }

  const isAccountAddress = Boolean(resolvedUserId);
  if (isAccountAddress) {
    await requireUserId(resolvedUserId);
  }

  let isDefault = false;
  if (isAccountAddress && resolvedUserId) {
    const existing = await db
      .select({ id: address.id })
      .from(address)
      .where(eq(address.userProfileId, resolvedUserId));
    isDefault =
      options?.setAsDefault === true ||
      (options?.setAsDefault !== false && existing.length === 0);
    if (isDefault) {
      await clearDefaultForUser(resolvedUserId);
    }
  }

  const [inserted] = await db
    .insert(address)
    .values({
      line1: data.line1.trim(),
      line2: data.line2?.trim() || null,
      city: data.city.trim(),
      state: data.state,
      postal_code: data.postal_code.trim(),
      country: "IN",
      full_name: data.fullName.trim(),
      email: data.email.trim(),
      mobile: data.mobile.trim(),
      is_default: isDefault,
      userProfileId: resolvedUserId ?? null,
    })
    .returning({ id: address.id });

  if (!inserted?.id) {
    throw new Error("Could not save address. Please try again.");
  }

  return {
    addressId: inserted.id,
    ...data,
  };
}

export async function updateUserAddress(
  addressId: string,
  data: AddressFormValues,
) {
  const userId = await requireUserId();
  const [updated] = await db
    .update(address)
    .set({
      line1: data.line1.trim(),
      line2: data.line2?.trim() || null,
      city: data.city.trim(),
      state: data.state,
      postal_code: data.postal_code.trim(),
      country: "IN",
      full_name: data.fullName.trim(),
      email: data.email.trim(),
      mobile: data.mobile.trim(),
    })
    .where(and(eq(address.id, addressId), eq(address.userProfileId, userId)))
    .returning({ id: address.id });

  if (!updated?.id) {
    throw new Error("Address not found or could not be updated.");
  }

  return {
    addressId: updated.id,
    ...data,
  };
}

export async function deleteUserAddress(addressId: string) {
  const userId = await requireUserId();
  const [deleted] = await db
    .delete(address)
    .where(and(eq(address.id, addressId), eq(address.userProfileId, userId)))
    .returning({ id: address.id, is_default: address.is_default });

  if (!deleted?.id) {
    throw new Error("Address not found or could not be deleted.");
  }

  if (deleted.is_default) {
    const [nextDefault] = await db
      .select()
      .from(address)
      .where(eq(address.userProfileId, userId))
      .orderBy(desc(address.created_at))
      .limit(1);

    if (nextDefault) {
      await db
        .update(address)
        .set({ is_default: true })
        .where(eq(address.id, nextDefault.id));
    }
  }
}

export async function setDefaultUserAddress(addressId: string) {
  const userId = await requireUserId();
  const [target] = await db
    .select({ id: address.id })
    .from(address)
    .where(and(eq(address.id, addressId), eq(address.userProfileId, userId)));

  if (!target?.id) {
    throw new Error("Address not found.");
  }

  await clearDefaultForUser(userId);
  await db
    .update(address)
    .set({ is_default: true })
    .where(eq(address.id, addressId));

  return listUserAddresses();
}

export async function getSavedShippingAddress(
  addressId: string,
): Promise<AddressFormValues & { addressId: string }> {
  const userId = await requireUserId();
  const [row] = await db
    .select()
    .from(address)
    .where(and(eq(address.id, addressId), eq(address.userProfileId, userId)));

  if (!row) {
    throw new Error("Address not found.");
  }

  return toSavedShippingAddress(mapAddressRow(row));
}
