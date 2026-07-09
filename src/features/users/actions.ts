"use server";

import db from "@/lib/supabase/db";
import createServerClient from "@/lib/supabase/server";
import { User } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { profiles } from "../../lib/supabase/schema";
import { AdminUserFormData } from "@/features/users/validations";
import { requireAdminActionUser } from "@/lib/auth/require-admin";
import createClient from "@/lib/supabase/server";

export const getCurrentUser = async () => {
  const { getSessionUser } = await import("@/lib/auth/admin");
  return getSessionUser();
};
export const getCurrentUserSession = async () => {
  const { getSessionUser } = await import("@/lib/auth/admin");
  const user = await getSessionUser();
  if (!user) return null;

  const cookieStore = cookies();
  const supabase = createServerClient({ cookieStore });
  const { data } = await supabase.auth.getSession();
  return data.session;
};

/** Quick check from JWT metadata (safe optional chaining). */
export const isAdmin = (currentUser: User | null) =>
  Boolean(currentUser?.app_metadata?.isAdmin);

/** DB + metadata check for admin routes (profiles.is_admin fallback). */
export const checkIsAdmin = async (currentUser: User | null) => {
  const { isAdminUser } = await import("@/lib/auth/admin");
  return isAdminUser(currentUser);
};

export const getUser = async ({ userId }: { userId: string }) => {
  await requireAdminActionUser();
  const cookieStore = cookies();
  const adminAuthClient = createClient({ cookieStore, isAdmin: true }).auth
    .admin;

  try {
    const { data, error } = await adminAuthClient.getUserById(userId);
    return data;
  } catch (err) {
    throw new Error("There is an error");
  }
};

export const listUsers = async ({
  page = 1,
  perPage = 10,
}: {
  page?: number;
  perPage?: number;
}) => {
  await requireAdminActionUser();
  const cookieStore = cookies();
  const adminAuthClient = createClient({ cookieStore, isAdmin: true }).auth
    .admin;

  const {
    data: { users },
    error,
  } = await adminAuthClient.listUsers({
    page,
    perPage,
  });
  return users;
};

export const createUser = async ({
  email,
  name,
  password,
}: AdminUserFormData) => {
  await requireAdminActionUser();
  const cookieStore = cookies();
  const adminAuthClient = createClient({ cookieStore, isAdmin: true }).auth
    .admin;

  try {
    const existedUser = await db.query.profiles.findFirst({
      where: eq(profiles.email, email),
    });
    if (existedUser) throw new Error(`User with email ${email} is existed.`);

    const res = await adminAuthClient.createUser({
      email,
      password,
      role: "ADMIN",
      user_metadata: { name },
    });

    return res;
  } catch (err) {
    throw new Error("Unexpected error occured.");
  }
};
