import { deleteOrArchiveProducts } from "@/lib/admin/product-lifecycle";
import { publicValidationPayload } from "@/lib/api/public-error";
import { getSessionUser, isAdminUser } from "@/lib/auth/admin";
import { invalidateStorefrontCache } from "@/lib/cache/invalidate-storefront";
import db from "@/lib/supabase/db";
import { products } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const deleteSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1),
});

const updateStockSchema = z.object({
  id: z.string().trim().min(1),
  stock: z.number().int().min(0).max(99999),
});

async function ensureAdmin() {
  const user = await getSessionUser();
  const admin = await isAdminUser(user);
  if (!user || !admin) return null;
  return user;
}

async function revalidateProductPages() {
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/featured");
  revalidatePath("/collections");
  await invalidateStorefrontCache();
}

export async function DELETE(request: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(payload);
  if (!parsed.success) {
    const parseError = parsed as z.SafeParseError<z.infer<typeof deleteSchema>>;
    return NextResponse.json(
      publicValidationPayload("Invalid delete payload", parseError.error),
      { status: 400 },
    );
  }

  const outcome = await deleteOrArchiveProducts(parsed.data.ids);
  await revalidateProductPages();

  return NextResponse.json(outcome);
}

export async function GET(request: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ message: "Missing id" }, { status: 400 });
  }

  const row = await db.query.products.findFirst({
    where: eq(products.id, id),
  });
  if (!row) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, product: row });
}

export async function PATCH(request: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateStockSchema.safeParse(payload);
  if (!parsed.success) {
    const parseError = parsed as z.SafeParseError<
      z.infer<typeof updateStockSchema>
    >;
    return NextResponse.json(
      publicValidationPayload("Invalid stock payload", parseError.error),
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(products)
    .set({ stock: parsed.data.stock })
    .where(eq(products.id, parsed.data.id))
    .returning({ id: products.id, stock: products.stock });

  if (!updated) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/cart");
  await invalidateStorefrontCache();

  return NextResponse.json({ ok: true, product: updated });
}
