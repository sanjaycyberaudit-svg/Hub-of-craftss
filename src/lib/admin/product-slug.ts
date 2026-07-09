import db from "@/lib/supabase/db";
import { products } from "@/lib/supabase/schema";
import { slugify } from "@/lib/utils";
import { and, eq, ne, sql } from "drizzle-orm";

export const PRODUCT_CODE_LOCK_ID = 873214;

type DbExecutor = Pick<typeof db, "select" | "execute">;

export function productNameToSlug(name: string, productCode?: string | null) {
  const fromName = slugify(String(name ?? "").trim());
  if (fromName) return fromName;
  if (productCode) {
    return slugify(`product-${productCode}`) || "product";
  }
  return "product";
}

export async function createNextProductCode(executor: DbExecutor) {
  const lastCodeRows = await executor.execute<{ product_code: string | null }>(
    sql`select product_code
        from products
        where product_code like 'ST%'
        order by product_code desc
        limit 1`,
  );
  const lastCode = lastCodeRows[0]?.product_code ?? null;
  const lastNumber = Number.parseInt(lastCode?.replace(/^ST/i, "") ?? "0", 10);
  const next = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;
  return `ST${String(next).padStart(6, "0")}`;
}

export async function buildUniqueProductSlug(
  executor: DbExecutor,
  name: string,
  productCode?: string | null,
  excludeId?: string,
) {
  const base = productNameToSlug(name, productCode);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await executor
      .select({ id: products.id })
      .from(products)
      .where(
        excludeId
          ? and(eq(products.slug, candidate), ne(products.id, excludeId))
          : eq(products.slug, candidate),
      )
      .limit(1);

    if (existing.length === 0) return candidate;

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}
