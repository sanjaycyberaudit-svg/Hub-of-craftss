import db from "@/lib/supabase/db";
import { products } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";
import { CACHE_TAGS } from "@/lib/cache/constants";
import { withStorefrontCache } from "@/lib/cache/storefront-cache";
import { isControlFlowError } from "@/lib/resilience";

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

/**
 * Returns `null` when the draft list cannot be resolved (no fresh read and no
 * stale copy). Callers must fail closed on `null`: publishing an unfinished
 * product is worse than showing an empty section.
 */
export async function getDraftProductIdsSafe(): Promise<string[] | null> {
  try {
    return await getDraftProductIdsCached();
  } catch (error) {
    if (isControlFlowError(error)) throw error;
    console.error("[storefront] draft product ids unavailable:", error);
    return null;
  }
}
