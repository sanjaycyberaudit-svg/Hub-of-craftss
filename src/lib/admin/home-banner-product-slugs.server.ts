import db from "@/lib/supabase/db";
import { products } from "@/lib/supabase/schema";
import { inArray } from "drizzle-orm";
import type { HomeBannerSlideInput } from "./home-banner-links";

export async function loadProductSlugsForBannerSlides(
  slides: HomeBannerSlideInput[],
): Promise<Map<string, string>> {
  const productIds = [
    ...new Set(
      slides
        .map((slide) => String(slide.productId ?? "").trim())
        .filter(Boolean),
    ),
  ];

  if (productIds.length === 0) return new Map();

  const rows = await db
    .select({ id: products.id, slug: products.slug })
    .from(products)
    .where(inArray(products.id, productIds));

  return new Map(rows.map((row) => [row.id, row.slug]));
}
