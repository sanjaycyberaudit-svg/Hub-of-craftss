import db from "@/lib/supabase/db";
import { products } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";
import { CACHE_TAGS } from "@/lib/cache/constants";
import { withStorefrontCache } from "@/lib/cache/storefront-cache";

async function loadDraftProductIds() {
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.isDraft, true));

  return rows.map((row) => row.id);
}

export async function getDraftProductIdsCached() {
  return withStorefrontCache("sf:drafts", loadDraftProductIds, {
    revalidate: 60,
    tags: [CACHE_TAGS.drafts, CACHE_TAGS.products],
  });
}
