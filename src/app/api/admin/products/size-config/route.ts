import { publicValidationPayload } from "@/lib/api/public-error";
import { getSessionUser, isAdminUser } from "@/lib/auth/admin";
import {
  getProductSizeConfig,
  normalizeProductSizeConfig,
  upsertProductSizeConfig,
} from "@/lib/products/sizeConfig";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const saveSchema = z.object({
  productId: z.string().trim().min(1),
  config: z.object({
    enabled: z.boolean(),
    options: z.array(
      z.object({
        size: z.string().trim().max(8),
        qty: z.number().min(0),
      }),
    ),
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
  await upsertProductSizeConfig({
    productId: parsed.data.productId,
    config: normalized,
    updatedBy: user.id,
  });

  return NextResponse.json({ ok: true });
}
