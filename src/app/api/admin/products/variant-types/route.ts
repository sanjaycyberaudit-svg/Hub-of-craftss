import { getSessionUser, isAdminUser } from "@/lib/auth/admin";
import { listVariantTypeNames } from "@/lib/products/variant-type-catalog";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getSessionUser();
  const admin = await isAdminUser(user);
  if (!user || !admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const names = await listVariantTypeNames();
  return NextResponse.json({ ok: true, names });
}
