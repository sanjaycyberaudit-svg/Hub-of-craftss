import {
  publicErrorMessage,
  publicValidationPayload,
} from "@/lib/api/public-error";
import { deleteCategoryWithProducts } from "@/lib/admin/product-lifecycle";
import { invalidateStorefrontCache } from "@/lib/cache/invalidate-storefront";
import { getSessionUser, isAdminUser } from "@/lib/auth/admin";
import db from "@/lib/supabase/db";
import { collections } from "@/lib/supabase/schema";
import { slugify } from "@/lib/utils";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

function collectionNameToSlug(name: string) {
  return slugify(name.trim()) || "category";
}

async function buildUniqueCollectionSlug(name: string, excludeId?: string) {
  const base = collectionNameToSlug(name);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await db
      .select({ id: collections.id })
      .from(collections)
      .where(
        excludeId
          ? and(eq(collections.slug, candidate), ne(collections.id, excludeId))
          : eq(collections.slug, candidate),
      )
      .limit(1);

    if (existing.length === 0) return candidate;

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function revalidateCollectionPages() {
  revalidatePath("/collections");
  revalidatePath("/collections", "layout");
  revalidatePath("/shop");
  revalidatePath("/admin/collections");
  await invalidateStorefrontCache();
}

const collectionPayloadSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  featuredImageId: z.string().trim().min(1),
});

async function ensureAdmin() {
  const user = await getSessionUser();
  const admin = await isAdminUser(user);
  if (!user || !admin) return null;
  return user;
}

export async function POST(request: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = collectionPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    const parseError = parsed as z.SafeParseError<
      z.infer<typeof collectionPayloadSchema>
    >;
    return NextResponse.json(
      publicValidationPayload("Invalid category payload", parseError.error),
      { status: 400 },
    );
  }

  try {
    const name = parsed.data.name.trim();
    const slug = await buildUniqueCollectionSlug(name);
    const insertValues = {
      slug,
      label: name,
      title: name,
      description: parsed.data.description,
      featuredImageId: parsed.data.featuredImageId,
    };
    await db.insert(collections).values(insertValues);
    await revalidateCollectionPages();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/collections] POST failed:", error);
    return NextResponse.json(
      {
        message: publicErrorMessage(error, "Failed to create category."),
      },
      { status: 400 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const updatePayloadSchema = z.object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    description: z.string().trim().min(1),
    featuredImageId: z.string().trim().min(1),
  });
  const parsed = updatePayloadSchema.safeParse(payload);

  if (!parsed.success) {
    const parseError = parsed as z.SafeParseError<
      z.infer<typeof updatePayloadSchema>
    >;
    return NextResponse.json(
      publicValidationPayload("Invalid category payload", parseError.error),
      { status: 400 },
    );
  }

  const id = parsed.data.id;
  const name = parsed.data.name.trim();
  const setValues = {
    label: name,
    title: name,
    description: parsed.data.description,
    featuredImageId: parsed.data.featuredImageId,
  };

  try {
    const rows = await db
      .update(collections)
      .set(setValues)
      .where(eq(collections.id, id))
      .returning({ id: collections.id });

    if (rows.length < 1) {
      return NextResponse.json(
        { message: "Category was not updated. Please retry." },
        { status: 404 },
      );
    }

    await revalidateCollectionPages();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/collections] PUT failed:", error);
    return NextResponse.json(
      {
        message: publicErrorMessage(error, "Failed to update category."),
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = z.object({ id: z.string().trim().min(1) }).safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Category id is required." },
      { status: 400 },
    );
  }

  try {
    const outcome = await deleteCategoryWithProducts(parsed.data.id);
    if (!outcome) {
      return NextResponse.json(
        { message: "Category not found." },
        { status: 404 },
      );
    }

    await revalidateCollectionPages();
    return NextResponse.json({
      ok: true,
      deletedId: parsed.data.id,
      ...outcome,
    });
  } catch (error) {
    console.error("[admin/collections] DELETE failed:", error);
    return NextResponse.json(
      {
        message: publicErrorMessage(error, "Failed to delete category."),
      },
      { status: 400 },
    );
  }
}
