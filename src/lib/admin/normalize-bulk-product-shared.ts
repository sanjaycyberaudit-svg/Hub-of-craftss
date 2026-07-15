import type { InsertProducts } from "@/lib/supabase/schema";
import { normalizeDiscountPercent } from "@/lib/products/discount";
import { z } from "zod";

const BADGE_VALUES = new Set(["new_product", "best_sale", "featured"]);

export const bulkSharedInputSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required for bulk mode."),
    description: z
      .string()
      .trim()
      .min(1, "Description is required.")
      .max(4000)
      .default(""),
    isDraft: z.coerce.boolean().default(true),
    collectionId: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((value) => (value ? value : null)),
    badge: z
      .enum(["new_product", "best_sale", "featured"])
      .optional()
      .nullable()
      .transform((value) => value ?? null),
    rating: z.string().trim().min(1).default("4"),
    price: z.string().trim().min(1).default("0"),
    stock: z.coerce.number().int().min(0).max(99999).default(0),
    discountEnabled: z.coerce.boolean().default(false),
    discountPercent: z
      .union([z.coerce.number(), z.null()])
      .optional()
      .transform((value) => (value == null ? null : value)),
  })
  .superRefine((data, ctx) => {
    if (
      data.discountEnabled &&
      normalizeDiscountPercent(data.discountPercent) === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Discount percent must be between 1 and 99 when discount is enabled.",
        path: ["discountPercent"],
      });
    }
  });

export type BulkSharedInput = z.infer<typeof bulkSharedInputSchema>;

export type NormalizedBulkDraftShared = {
  baseName: string;
  description: string;
  isDraft: boolean;
  collectionId: string | null;
  badge: InsertProducts["badge"];
  rating: string;
  price: string;
  stock: number;
  discountEnabled: boolean;
  discountPercent: number | null;
};

export function normalizeBulkDraftShared(
  data: BulkSharedInput,
): NormalizedBulkDraftShared {
  const discountEnabled = Boolean(data.discountEnabled);
  const discountPercent = discountEnabled
    ? normalizeDiscountPercent(data.discountPercent)
    : null;

  if (discountEnabled && discountPercent === null) {
    throw new Error(
      "Discount percent must be between 1 and 99 when discount is enabled.",
    );
  }

  const badgeRaw = data.badge == null ? null : String(data.badge).trim();
  const badge =
    badgeRaw && BADGE_VALUES.has(badgeRaw)
      ? (badgeRaw as InsertProducts["badge"])
      : null;

  return {
    baseName: data.name.trim(),
    description: data.description,
    isDraft: data.isDraft,
    collectionId: data.collectionId,
    badge,
    rating: data.rating,
    price: data.price,
    stock: Math.max(0, Math.round(data.stock)),
    discountEnabled,
    discountPercent,
  };
}

export function parseBulkSharedInput(raw: unknown): NormalizedBulkDraftShared {
  const parsed = bulkSharedInputSchema.safeParse(raw);
  if (!parsed.success) {
    const parseError = parsed as z.SafeParseError<
      z.infer<typeof bulkSharedInputSchema>
    >;
    const discountIssue = parseError.error.issues.find((issue) =>
      issue.path.includes("discountPercent"),
    );
    if (discountIssue?.message) {
      throw new Error(discountIssue.message);
    }
    throw new Error("Invalid shared bulk product details.");
  }
  return normalizeBulkDraftShared(parsed.data);
}

export function buildBulkSharedPayloadFromForm(values: {
  name?: unknown;
  description?: unknown;
  isDraft?: unknown;
  collectionId?: unknown;
  badge?: unknown;
  rating?: unknown;
  price?: unknown;
  stock?: unknown;
  discountEnabled?: unknown;
  discountPercent?: unknown;
}): NormalizedBulkDraftShared {
  return parseBulkSharedInput({
    name: String(values.name ?? "").trim(),
    description: String(values.description ?? ""),
    isDraft: Boolean(values.isDraft),
    collectionId:
      typeof values.collectionId === "string" ? values.collectionId : null,
    badge:
      values.badge == null || values.badge === "" ? null : String(values.badge),
    rating: String(values.rating ?? "4"),
    price: String(values.price ?? "0"),
    stock: Number.isFinite(Number(values.stock))
      ? Math.max(0, Math.round(Number(values.stock)))
      : 0,
    discountEnabled: Boolean(values.discountEnabled),
    discountPercent:
      values.discountPercent == null || values.discountPercent === ""
        ? null
        : Number(values.discountPercent),
  });
}

export function buildBulkProductInsertValues(params: {
  shared: NormalizedBulkDraftShared;
  productName: string;
  slug: string;
  productCode: string;
  featuredImageId: string;
}): Omit<InsertProducts, "id" | "createdAt" | "totalComments" | "images"> {
  const { shared } = params;

  return {
    name: params.productName,
    slug: params.slug,
    productCode: params.productCode,
    featuredImageId: params.featuredImageId,
    description: shared.description,
    isDraft: shared.isDraft,
    collectionId: shared.collectionId,
    badge: shared.badge,
    rating: shared.rating,
    price: shared.price,
    stock: shared.stock,
    discountEnabled: shared.discountEnabled,
    discountPercent: shared.discountPercent,
    featured: false,
    tags: [],
  };
}
