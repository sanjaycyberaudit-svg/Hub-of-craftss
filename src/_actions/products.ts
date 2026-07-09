"use server";

import db from "@/lib/supabase/db";
import { InsertProducts, productMedias, products } from "@/lib/supabase/schema";
import { requireAdminActionUser } from "@/lib/auth/require-admin";
import { invalidateStorefrontCache } from "@/lib/cache/invalidate-storefront";
import {
  buildUniqueProductSlug,
  createNextProductCode,
  PRODUCT_CODE_LOCK_ID,
} from "@/lib/admin/product-slug";
import {
  buildBulkProductInsertValues,
  type NormalizedBulkDraftShared,
} from "@/lib/admin/normalize-bulk-product-shared";
import { normalizeProductFormPayload } from "@/lib/admin/normalize-product-form-payload";
import { eq, inArray, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { revalidatePath } from "next/cache";

function revalidateProductCatalogPaths() {
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/featured");
  revalidatePath("/shop");
  revalidatePath("/collections");
}

export const createProductAction = async (product: InsertProducts) => {
  await requireAdminActionUser();
  const normalized = normalizeProductFormPayload(product);

  const data = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(${PRODUCT_CODE_LOCK_ID})`,
    );

    const productCode = await createNextProductCode(tx);
    const slug = await buildUniqueProductSlug(tx, normalized.name, productCode);
    const values = {
      ...normalized,
      productCode,
      slug,
      tags: [] as string[],
    };

    createInsertSchema(products).parse(values);
    return tx.insert(products).values(values).returning();
  });

  revalidateProductCatalogPaths();
  await invalidateStorefrontCache();
  return data;
};

export const updateProductAction = async (
  productId: string,
  product: InsertProducts,
) => {
  await requireAdminActionUser();

  const [existing] = await db
    .select({
      slug: products.slug,
      productCode: products.productCode,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!existing) {
    throw new Error("Product not found.");
  }

  const normalized = normalizeProductFormPayload(product);
  const values = {
    ...normalized,
    slug: existing.slug,
    productCode: existing.productCode,
    tags: [] as string[],
  };

  createInsertSchema(products).parse(values);

  const insertedProduct = await db
    .update(products)
    .set(values)
    .where(eq(products.id, productId))
    .returning();

  revalidateProductCatalogPaths();
  await invalidateStorefrontCache();
  return insertedProduct;
};

export const getProductsByIds = async (productIds: string[]) => {
  return await db
    .select()
    .from(products)
    .where(inArray(products.id, productIds));
};

type DraftSourceMedia = {
  mediaId: string;
  originalFileName: string;
};

export type BulkDraftSharedData = NormalizedBulkDraftShared;

export type BulkDraftCreateResult = {
  id: string;
  productCode: string;
  name: string;
  slug: string;
};

function getFileNameBase(fileName: string) {
  const cleaned = fileName.replace(/\.[^/.]+$/, "").trim();
  return cleaned || "Product";
}

const DEFAULT_BULK_SHARED: NormalizedBulkDraftShared = {
  baseName: "Product",
  description: "",
  isDraft: true,
  collectionId: null,
  badge: null,
  rating: "4",
  price: "0",
  stock: 0,
  discountEnabled: false,
  discountPercent: null,
};

export async function createDraftProductsFromMedia(
  mediaItems: DraftSourceMedia[],
  shared?: BulkDraftSharedData,
): Promise<BulkDraftCreateResult[]> {
  await requireAdminActionUser();
  if (mediaItems.length === 0) return [];

  const normalizedShared = shared ?? DEFAULT_BULK_SHARED;

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(${PRODUCT_CODE_LOCK_ID})`,
    );

    const lastCodeRows = await tx.execute<{ product_code: string | null }>(
      sql`select product_code
          from products
          where product_code like 'ST%'
          order by product_code desc
          limit 1`,
    );
    const lastCode = lastCodeRows[0]?.product_code ?? null;
    const lastNumber = Number.parseInt(
      lastCode?.replace(/^ST/i, "") ?? "0",
      10,
    );
    const start = Number.isFinite(lastNumber) ? lastNumber : 0;

    const createdProducts: BulkDraftCreateResult[] = [];

    for (let index = 0; index < mediaItems.length; index += 1) {
      const currentNumber = start + index + 1;
      const productCode = `ST${String(currentNumber).padStart(6, "0")}`;
      const fileNameBase = getFileNameBase(mediaItems[index].originalFileName);
      const nameBase = (normalizedShared.baseName || fileNameBase).trim();
      const productName = `${nameBase} ${productCode}`;
      const slug = await buildUniqueProductSlug(tx, productName, productCode);

      const insertValues = buildBulkProductInsertValues({
        shared: normalizedShared,
        productName,
        slug,
        productCode,
        featuredImageId: mediaItems[index].mediaId,
      });

      createInsertSchema(products).parse(insertValues);

      const [created] = await tx
        .insert(products)
        .values(insertValues)
        .returning({
          id: products.id,
          name: products.name,
          slug: products.slug,
          productCode: products.productCode,
        });

      await tx.insert(productMedias).values({
        productId: created.id,
        mediaId: mediaItems[index].mediaId,
        priority: 1,
      });

      createdProducts.push({
        id: created.id,
        name: created.name,
        slug: created.slug,
        productCode: created.productCode ?? productCode,
      });
    }

    revalidateProductCatalogPaths();
    await invalidateStorefrontCache();
    return createdProducts;
  });
}
