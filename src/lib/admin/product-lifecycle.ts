import { loadMediaUsageForDelete } from "@/lib/admin/media-library";
import {
  addDays,
  mediaPurgeAtIso,
  UNPAID_ORDER_RETENTION_DAYS,
} from "@/lib/admin/product-lifecycle-policy";
import { deleteMediaStorageKeys } from "@/lib/storage/deleteMediaFiles";
import db from "@/lib/supabase/db";
import {
  collections,
  medias,
  orderLines,
  orders,
  productMedias,
  products,
} from "@/lib/supabase/schema";
import { and, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";

export type ProductLifecycleOutcome = {
  deletedIds: string[];
  archivedIds: string[];
  blocked: { id: string; reason: string }[];
};

export async function getProductIdsWithPaidOrders(
  productIds: string[],
): Promise<Set<string>> {
  if (productIds.length === 0) return new Set();

  const rows = await db
    .selectDistinct({ productId: orderLines.productId })
    .from(orderLines)
    .innerJoin(orders, eq(orderLines.orderId, orders.id))
    .where(
      and(
        inArray(orderLines.productId, productIds),
        eq(orders.payment_status, "paid"),
      ),
    );

  return new Set(
    rows.map((row) => row.productId).filter((id): id is string => Boolean(id)),
  );
}

export async function backfillOrderLineSnapshotsForProduct(productId: string) {
  await db.execute(sql`
    UPDATE order_lines ol
    SET
      product_name_snapshot = COALESCE(ol.product_name_snapshot, src.name),
      product_slug_snapshot = COALESCE(ol.product_slug_snapshot, src.slug),
      product_code_snapshot = COALESCE(ol.product_code_snapshot, src.product_code),
      product_image_key_snapshot = COALESCE(ol.product_image_key_snapshot, src.image_key)
    FROM (
      SELECT
        ol2.id AS order_line_id,
        p.name,
        p.slug,
        p.product_code,
        m.key AS image_key
      FROM order_lines ol2
      INNER JOIN products p ON p.id = ol2.product_id
      LEFT JOIN medias m ON m.id = p.featured_image_id
      WHERE ol2.product_id = ${productId}
    ) src
    WHERE ol.id = src.order_line_id
  `);
}

async function collectProductMediaIds(productId: string): Promise<string[]> {
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
    columns: { featuredImageId: true },
  });
  if (!product) return [];

  const galleryRows = await db
    .select({ mediaId: productMedias.mediaId })
    .from(productMedias)
    .where(eq(productMedias.productId, productId));

  const ids = new Set<string>();
  if (product.featuredImageId) ids.add(product.featuredImageId);
  for (const row of galleryRows) ids.add(row.mediaId);
  return [...ids];
}

async function deleteExclusiveProductMedias(
  mediaIds: string[],
  productId: string,
) {
  if (mediaIds.length === 0) return;

  const { usageByMedia } = await loadMediaUsageForDelete(mediaIds);
  const keysToDelete: string[] = [];
  const mediaIdsToDelete: string[] = [];

  for (const mediaId of mediaIds) {
    const usage = usageByMedia.get(mediaId);
    const productIds = usage?.productIds ?? [];
    const exclusive = productIds.length === 1 && productIds[0] === productId;

    if (!exclusive) continue;
    if ((usage?.collectionCount ?? 0) > 0) continue;
    if ((usage?.testimonialCount ?? 0) > 0) continue;
    if ((usage?.bannerSlideCount ?? 0) > 0) continue;

    const mediaRow = await db.query.medias.findFirst({
      where: eq(medias.id, mediaId),
      columns: { key: true },
    });
    if (mediaRow?.key) keysToDelete.push(mediaRow.key);
    mediaIdsToDelete.push(mediaId);
  }

  await deleteMediaStorageKeys(keysToDelete);
  if (mediaIdsToDelete.length > 0) {
    await db.delete(medias).where(inArray(medias.id, mediaIdsToDelete));
  }
}

export async function deleteProductsCompletely(productIds: string[]) {
  for (const productId of productIds) {
    const mediaIds = await collectProductMediaIds(productId);
    await db.delete(products).where(eq(products.id, productId));
    await deleteExclusiveProductMedias(mediaIds, productId);
  }
}

export async function archiveProductsWithPaidHistory(
  productIds: string[],
  options?: { clearCollection?: boolean },
) {
  const nowIso = new Date().toISOString();
  const purgeAtIso = mediaPurgeAtIso();

  for (const productId of productIds) {
    await backfillOrderLineSnapshotsForProduct(productId);
  }

  await db
    .update(products)
    .set({
      isDraft: true,
      featured: false,
      archivedAt: nowIso,
      mediaPurgeAt: purgeAtIso,
      ...(options?.clearCollection ? { collectionId: null } : {}),
    })
    .where(inArray(products.id, productIds));
}

export async function deleteOrArchiveProducts(
  productIds: string[],
  options?: { clearCollection?: boolean },
): Promise<ProductLifecycleOutcome> {
  const uniqueIds = [...new Set(productIds)];
  const existingRows = await db
    .select({ id: products.id })
    .from(products)
    .where(inArray(products.id, uniqueIds));
  const existingIds = new Set(existingRows.map((row) => row.id));
  const paidLinked = await getProductIdsWithPaidOrders(uniqueIds);

  const deletedIds: string[] = [];
  const archivedIds: string[] = [];
  const blocked: { id: string; reason: string }[] = [];
  const toDelete: string[] = [];
  const toArchive: string[] = [];

  for (const id of uniqueIds) {
    if (!existingIds.has(id)) {
      blocked.push({ id, reason: "Product not found." });
      continue;
    }
    if (paidLinked.has(id)) {
      toArchive.push(id);
    } else {
      toDelete.push(id);
    }
  }

  if (toDelete.length > 0) {
    await deleteProductsCompletely(toDelete);
    deletedIds.push(...toDelete);
  }

  if (toArchive.length > 0) {
    await archiveProductsWithPaidHistory(toArchive, options);
    archivedIds.push(...toArchive);
  }

  return { deletedIds, archivedIds, blocked };
}

export async function deleteCategoryWithProducts(collectionId: string) {
  const [collection] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(eq(collections.id, collectionId))
    .limit(1);

  if (!collection) {
    return null;
  }

  const productRows = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.collectionId, collectionId));

  const productOutcome = await deleteOrArchiveProducts(
    productRows.map((row) => row.id),
    { clearCollection: true },
  );

  await db.delete(collections).where(eq(collections.id, collectionId));

  return productOutcome;
}

export async function purgeArchivedProductMedia() {
  const nowIso = new Date().toISOString();
  const dueProducts = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        isNotNull(products.archivedAt),
        isNotNull(products.mediaPurgeAt),
        lte(products.mediaPurgeAt, nowIso),
      ),
    );

  for (const { id } of dueProducts) {
    await backfillOrderLineSnapshotsForProduct(id);
    const mediaIds = await collectProductMediaIds(id);
    await db.delete(products).where(eq(products.id, id));
    await deleteExclusiveProductMedias(mediaIds, id);
  }

  return { purgedProducts: dueProducts.length };
}

export async function deleteStaleUnpaidOrders() {
  const cutoff = addDays(new Date(), -UNPAID_ORDER_RETENTION_DAYS);

  const staleOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(eq(orders.payment_status, "unpaid"), lte(orders.createdAt, cutoff)),
    );

  const orderIds = staleOrders.map((row) => row.id);
  if (orderIds.length === 0) {
    return { deletedOrders: 0 };
  }

  await db.delete(orderLines).where(inArray(orderLines.orderId, orderIds));
  await db.delete(orders).where(inArray(orders.id, orderIds));

  return { deletedOrders: orderIds.length };
}

export async function runLifecycleCleanup() {
  const unpaid = await deleteStaleUnpaidOrders();
  const archive = await purgeArchivedProductMedia();
  return { ...unpaid, ...archive };
}
