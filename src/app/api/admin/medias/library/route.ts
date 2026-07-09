import { publicValidationPayload } from "@/lib/api/public-error";
import { getProductIdsWithPaidOrders } from "@/lib/admin/product-lifecycle";
import {
  ADMIN_MEDIA_PAGE_SIZE,
  fetchMediaLibraryPage,
  invalidateAdminMediaCache,
  loadMediaUsageForDelete,
  type MediaSection,
} from "@/lib/admin/media-library";
import { getSessionUser, isAdminUser } from "@/lib/auth/admin";
import db from "@/lib/supabase/db";
import { apiSettings, medias, products } from "@/lib/supabase/schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const DELETE_SCHEMA = z.object({
  section: z.enum(["banner", "product"]),
  mediaIds: z.array(z.string().trim().min(1)).min(1),
});

async function ensureAdmin() {
  const user = await getSessionUser();
  const admin = await isAdminUser(user);
  if (!user || !admin) return null;
  return user;
}

export async function GET(request: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(
    ADMIN_MEDIA_PAGE_SIZE,
    Math.max(
      12,
      Number(searchParams.get("limit") ?? ADMIN_MEDIA_PAGE_SIZE) ||
        ADMIN_MEDIA_PAGE_SIZE,
    ),
  );
  const section: MediaSection =
    searchParams.get("section") === "banner" ? "banner" : "product";

  try {
    const payload = await fetchMediaLibraryPage({ page, limit, section });
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("[admin/medias/library] GET failed:", error);
    return NextResponse.json(
      { message: "Could not load media library." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = DELETE_SCHEMA.safeParse(payload);
  if (!parsed.success) {
    const parseError = parsed as z.SafeParseError<
      z.infer<typeof DELETE_SCHEMA>
    >;
    return NextResponse.json(
      publicValidationPayload("Invalid delete request", parseError.error),
      { status: 400 },
    );
  }

  const mediaIds = [...new Set(parsed.data.mediaIds)];
  const section = parsed.data.section;
  const { usageByMedia, bannerSetting } =
    await loadMediaUsageForDelete(mediaIds);

  const productIdsForOrderCheck = new Set<string>();
  for (const mediaId of mediaIds) {
    const usage = usageByMedia.get(mediaId);
    if (!usage) continue;
    if (section === "product" && usage.productIds.length === 1) {
      productIdsForOrderCheck.add(usage.productIds[0]);
    }
  }

  const orderLineRows =
    productIdsForOrderCheck.size > 0
      ? [...(await getProductIdsWithPaidOrders([...productIdsForOrderCheck]))]
      : [];
  const hasPaidOrderHistoryByProduct = new Set(orderLineRows);

  const deletedMediaIds: string[] = [];
  const deletedProductIds: string[] = [];
  const blocked: { mediaId: string; reason: string }[] = [];

  for (const mediaId of mediaIds) {
    const usage = usageByMedia.get(mediaId);
    if (!usage) {
      blocked.push({ mediaId, reason: "Media not found." });
      continue;
    }

    if (usage.section !== section) {
      blocked.push({
        mediaId,
        reason: `Media belongs to ${usage.section} section.`,
      });
      continue;
    }

    if (usage.collectionCount > 0 || usage.testimonialCount > 0) {
      blocked.push({
        mediaId,
        reason:
          "Media is used by collections/testimonials. Remove those references first.",
      });
      continue;
    }

    if (section === "banner") {
      if (usage.productCount > 0) {
        blocked.push({
          mediaId,
          reason: "Media is linked to product(s), cannot treat as banner-only.",
        });
        continue;
      }

      await db.delete(medias).where(eq(medias.id, mediaId));
      deletedMediaIds.push(mediaId);
      continue;
    }

    if (usage.bannerSlideCount > 0) {
      blocked.push({
        mediaId,
        reason: "Media is linked to home banner slides.",
      });
      continue;
    }

    if (usage.productCount === 0) {
      await db.delete(medias).where(eq(medias.id, mediaId));
      deletedMediaIds.push(mediaId);
      continue;
    }

    if (usage.productCount > 1) {
      blocked.push({
        mediaId,
        reason:
          "Media is used by multiple products; cannot auto-delete safely.",
      });
      continue;
    }

    const productId = usage.productIds[0];
    if (hasPaidOrderHistoryByProduct.has(productId)) {
      blocked.push({
        mediaId,
        reason:
          "Product has paid order history; it is archived instead of deleted.",
      });
      continue;
    }

    await db.delete(products).where(eq(products.id, productId));
    await db.delete(medias).where(eq(medias.id, mediaId));
    deletedProductIds.push(productId);
    deletedMediaIds.push(mediaId);
  }

  if (section === "banner" && deletedMediaIds.length > 0 && bannerSetting) {
    const value = (bannerSetting.value ?? {}) as Record<string, unknown>;
    const slides = Array.isArray(value.slides) ? value.slides : [];
    const filteredSlides = slides.filter((slide) => {
      const imageMediaId = String(
        (slide as Record<string, unknown>).imageMediaId ?? "",
      ).trim();
      return !deletedMediaIds.includes(imageMediaId);
    });

    await db
      .update(apiSettings)
      .set({
        value: { ...value, slides: filteredSlides },
        updatedAt: new Date().toISOString(),
        updatedBy: user.id,
      })
      .where(eq(apiSettings.key, "home_banner_slides"));
  }

  invalidateAdminMediaCache();
  revalidatePath("/admin/medias");
  revalidatePath("/", "layout");

  return NextResponse.json({
    deletedMediaIds,
    deletedProductIds,
    blocked,
  });
}
