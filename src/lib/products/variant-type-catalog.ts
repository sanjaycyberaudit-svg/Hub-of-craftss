import db from "@/lib/supabase/db";
import { apiSettings } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";
import {
  DEFAULT_VARIANT_TYPE_NAMES,
  VARIANT_TYPE_CATALOG_KEY,
  mergeVariantTypeNames,
  parseVariantTypeCatalogValue,
  serializeVariantTypeCatalog,
} from "./variant-type-catalog-shared";

export * from "./variant-type-catalog-shared";

export async function listVariantTypeNames(): Promise<string[]> {
  try {
    const row = await db.query.apiSettings.findFirst({
      where: eq(apiSettings.key, VARIANT_TYPE_CATALOG_KEY),
    });
    return parseVariantTypeCatalogValue(row?.value);
  } catch (error) {
    console.error("[variant-type-catalog] list failed:", error);
    return [...DEFAULT_VARIANT_TYPE_NAMES];
  }
}

export async function registerVariantTypeNames(
  names: string[],
  updatedBy?: string | null,
): Promise<string[]> {
  const existing = await listVariantTypeNames();
  const merged = mergeVariantTypeNames(existing, names);
  const value = serializeVariantTypeCatalog(merged);

  await db
    .insert(apiSettings)
    .values({
      key: VARIANT_TYPE_CATALOG_KEY,
      value,
      isEnabled: true,
      updatedBy: updatedBy ?? null,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: apiSettings.key,
      set: {
        value,
        isEnabled: true,
        updatedBy: updatedBy ?? null,
        updatedAt: new Date().toISOString(),
      },
    });

  return merged;
}
