import { publicValidationPayload } from "@/lib/api/public-error";
import { getSessionUser, isAdminUser } from "@/lib/auth/admin";
import {
  getActiveOptionGroups,
  getProductSizeConfig,
  normalizeProductSizeConfig,
  PRODUCT_OPTION_NAME_MAX,
  PRODUCT_OPTION_VALUE_MAX,
  upsertProductSizeConfig,
} from "@/lib/products/sizeConfig";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const optionSchema = z
  .object({
    value: z.string().trim().max(PRODUCT_OPTION_VALUE_MAX).optional(),
    size: z.string().trim().max(PRODUCT_OPTION_VALUE_MAX).optional(),
    qty: z.number().min(0),
    price: z.number().min(0).nullable().optional(),
  })
  .transform((row) => ({
    value: (row.value ?? row.size ?? "").trim(),
    qty: row.qty,
    price: row.price ?? null,
  }));

const groupSchema = z.object({
  id: z.string().trim().min(1).max(64).optional(),
  name: z.string().trim().max(PRODUCT_OPTION_NAME_MAX).optional(),
  options: z.array(optionSchema),
});

const saveSchema = z.object({
  productId: z.string().trim().min(1),
  config: z
    .object({
      enabled: z.boolean(),
      // New multi-group shape.
      groups: z.array(groupSchema).optional(),
      // Legacy flat shape still accepted.
      name: z.string().trim().max(PRODUCT_OPTION_NAME_MAX).optional(),
      options: z.array(optionSchema).optional(),
    })
    .superRefine((config, ctx) => {
      if (!config.groups && !config.options) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Provide groups or options.",
          path: ["groups"],
        });
      }
    }),
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

  const productId = request.nextUrl.searchParams.get("productId")?.trim();
  if (!productId) {
    return NextResponse.json({ message: "Missing productId" }, { status: 400 });
  }

  const config = await getProductSizeConfig(productId);
  return NextResponse.json({ ok: true, config });
}

export async function POST(request: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = saveSchema.safeParse(payload);
  if (!parsed.success) {
    const parseError = parsed as z.SafeParseError<z.infer<typeof saveSchema>>;
    return NextResponse.json(
      publicValidationPayload("Invalid payload", parseError.error),
      { status: 400 },
    );
  }

  const normalized = normalizeProductSizeConfig(parsed.data.config);
  if (normalized.enabled) {
    const activeGroups = getActiveOptionGroups(normalized);
    if (activeGroups.length === 0) {
      return NextResponse.json(
        {
          message:
            "Add at least one variant group with stock when options/variants are enabled.",
        },
        { status: 400 },
      );
    }

    for (const group of activeGroups) {
      const stocked = group.options.filter(
        (option) => Number(option.qty ?? 0) > 0,
      );
      const missingPrice = stocked.find((option) => option.price == null);
      if (missingPrice) {
        const label = String(missingPrice.value ?? "").trim() || "an option";
        return NextResponse.json(
          {
            message: `Enter a price for ${group.name} → ${label}. Each choice needs its own price (0 is allowed).`,
          },
          { status: 400 },
        );
      }
    }
  }

  await upsertProductSizeConfig({
    productId: parsed.data.productId,
    config: normalized,
    updatedBy: user.id,
  });

  return NextResponse.json({ ok: true });
}
