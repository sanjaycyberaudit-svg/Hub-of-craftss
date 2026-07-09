import {
  publicErrorMessage,
  publicValidationPayload,
} from "@/lib/api/public-error";
import { getSessionUser, isAdminUser } from "@/lib/auth/admin";
import db from "@/lib/supabase/db";
import { testimonials } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const baseSchema = z.object({
  kind: z.enum(["text", "video"]),
  customerName: z.string().trim().min(1),
  location: z.string().trim().nullable().optional(),
  quote: z.string().trim().nullable().optional(),
  rating: z.number().int().min(1).max(5),
  videoUrl: z.string().trim().nullable().optional(),
  featuredImageId: z.string().trim().nullable().optional(),
  isPublished: z.boolean(),
  order: z.number().int().nullable().optional(),
});

const createSchema = baseSchema;
const updateSchema = baseSchema.extend({
  id: z.string().trim().min(1),
});

const deleteSchema = z.object({
  id: z.string().trim().min(1),
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
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    const parseError = parsed as z.SafeParseError<z.infer<typeof createSchema>>;
    return NextResponse.json(
      publicValidationPayload("Invalid testimonial payload", parseError.error),
      { status: 400 },
    );
  }

  try {
    const insertValues = {
      kind: parsed.data.kind,
      customerName: parsed.data.customerName,
      location: parsed.data.location ?? null,
      quote: parsed.data.quote ?? null,
      rating: parsed.data.rating,
      videoUrl: parsed.data.videoUrl ?? null,
      featuredImageId: parsed.data.featuredImageId ?? null,
      isPublished: parsed.data.isPublished,
      order: parsed.data.order ?? null,
    };
    await db.insert(testimonials).values(insertValues);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/testimonials] POST failed:", error);
    return NextResponse.json(
      {
        message: publicErrorMessage(error, "Failed to create testimonial."),
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
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    const parseError = parsed as z.SafeParseError<z.infer<typeof updateSchema>>;
    return NextResponse.json(
      publicValidationPayload("Invalid testimonial payload", parseError.error),
      { status: 400 },
    );
  }

  const id = parsed.data.id;
  const setValues = {
    kind: parsed.data.kind,
    customerName: parsed.data.customerName,
    location: parsed.data.location ?? null,
    quote: parsed.data.quote ?? null,
    rating: parsed.data.rating,
    videoUrl: parsed.data.videoUrl ?? null,
    featuredImageId: parsed.data.featuredImageId ?? null,
    isPublished: parsed.data.isPublished,
    order: parsed.data.order ?? null,
  };

  try {
    const rows = await db
      .update(testimonials)
      .set(setValues)
      .where(eq(testimonials.id, id))
      .returning({ id: testimonials.id });

    if (rows.length < 1) {
      return NextResponse.json(
        { message: "Testimonial not found for update." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/testimonials] PUT failed:", error);
    return NextResponse.json(
      {
        message: publicErrorMessage(error, "Failed to update testimonial."),
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
  const parsed = deleteSchema.safeParse(payload);
  if (!parsed.success) {
    const parseError = parsed as z.SafeParseError<z.infer<typeof deleteSchema>>;
    return NextResponse.json(
      publicValidationPayload("Invalid delete payload", parseError.error),
      { status: 400 },
    );
  }

  try {
    const rows = await db
      .delete(testimonials)
      .where(eq(testimonials.id, parsed.data.id))
      .returning({ id: testimonials.id });

    if (rows.length < 1) {
      return NextResponse.json(
        { message: "Testimonial not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/testimonials] DELETE failed:", error);
    return NextResponse.json(
      {
        message: publicErrorMessage(error, "Failed to delete testimonial."),
      },
      { status: 400 },
    );
  }
}
