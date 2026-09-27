import { revalidatePath } from "next/cache";

function safeRevalidatePath(path: string, type?: "page" | "layout") {
  try {
    revalidatePath(path, type);
  } catch (error) {
    console.warn(`[cache] revalidatePath ${path} failed:`, error);
  }
}

/** ISR pages that render product lists (cards, counts, featured). */
export function revalidateProductListPages() {
  safeRevalidatePath("/");
  safeRevalidatePath("/shop");
  safeRevalidatePath("/featured");
  safeRevalidatePath("/collections");
  safeRevalidatePath("/collections/[collectionSlug]", "page");
}

export function revalidateProductPages(slugs: readonly string[]) {
  slugs.forEach((slug) => safeRevalidatePath(`/shop/${slug}`));
}

/** Every product page's HTML (they share the recommendations strip). */
export function revalidateAllProductPages() {
  safeRevalidatePath("/shop/[slug]", "page");
}

export function revalidateAllStorefrontPages() {
  safeRevalidatePath("/", "layout");
}
