import { getSessionUser, isAdminUser } from "@/lib/auth/admin";
import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** For API routes — returns 401 response when caller is not admin. */
export async function requireAdminApiUser(): Promise<
  { user: User; error: null } | { user: null; error: NextResponse }
> {
  const user = await getSessionUser();
  if (!(await isAdminUser(user))) {
    return {
      user: null,
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user: user!, error: null };
}

/** For server actions — throws when caller is not admin. */
export async function requireAdminActionUser(): Promise<User> {
  const user = await getSessionUser();
  if (!(await isAdminUser(user))) {
    throw new ForbiddenError();
  }
  return user!;
}
