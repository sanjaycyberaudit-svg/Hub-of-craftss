import db from "@/lib/supabase/db";
import { productMedias } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";
import { normalizeProductImageMediaIds } from "@/lib/admin/product-gallery-shared";

export {
  MAX_PRODUCT_IMAGES,
  normalizeProductImageMediaIds,
} from "@/lib/admin/product-gallery-shared";

type DbLike = Pick<typeof db, "delete" | "insert">;

/**
 * Replaces gallery rows. Featured image is stored on `products.featured_image_id`;
 * `product_medias` holds additional images only (excludes featured to avoid PDP duplicates).
 */
export async function syncProductGalleryImages(
  productId: string,
  orderedMediaIds: string[],
  tx: DbLike = db,
): Promise<{ featuredImageId: string | null; galleryMediaIds: string[] }> {
  const normalized = normalizeProductImageMediaIds(orderedMediaIds);
  const featuredImageId = normalized[0] ?? null;
  const galleryMediaIds = normalized.slice(1);

  await tx.delete(productMedias).where(eq(productMedias.productId, productId));

  if (galleryMediaIds.length > 0) {
    await tx.insert(productMedias).values(
      galleryMediaIds.map((mediaId, index) => ({
        productId,
        mediaId,
        priority: galleryMediaIds.length - index,
      })),
    );
  }

  return { featuredImageId, galleryMediaIds };
}

export async function loadProductGalleryMediaIds(
  productId: string,
): Promise<string[]> {
  const rows = await db
    .select({
      mediaId: productMedias.mediaId,
      priority: productMedias.priority,
    })
    .from(productMedias)
    .where(eq(productMedias.productId, productId));

  return rows
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .map((row) => row.mediaId);
}
