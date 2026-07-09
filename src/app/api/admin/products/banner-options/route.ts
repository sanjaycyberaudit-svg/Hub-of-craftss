import { getSessionUser, isAdminUser } from "@/lib/auth/admin";
import db from "@/lib/supabase/db";
import { products } from "@/lib/supabase/schema";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function ensureAdmin() {
  const user = await getSessionUser();
  const admin = await isAdminUser(user);
  if (!user || !admin) return null;
  return user;
}

export async function GET() {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      productCode: products.productCode,
      isDraft: products.isDraft,
    })
    .from(products)
    .where(eq(products.isDraft, false))
    .orderBy(desc(products.createdAt))
    .limit(500);

  return NextResponse.json({
    products: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      productCode: row.productCode,
      href: `/shop/${row.slug}`,
    })),
  });
}
