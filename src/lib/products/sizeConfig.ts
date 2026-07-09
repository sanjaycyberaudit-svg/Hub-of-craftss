import { CACHE_TAGS } from "@/lib/cache/constants";
import { invalidateStorefrontCache } from "@/lib/cache/invalidate-storefront";
import { withStorefrontCache } from "@/lib/cache/storefront-cache";
import db from "@/lib/supabase/db";
import { apiSettings } from "@/lib/supabase/schema";
import { eq, inArray } from "drizzle-orm";

export type ProductSizeOption = {
  size: string;
  qty: number;
};

export type ProductSizeConfig = {
  enabled: boolean;
  options: ProductSizeOption[];
};

const KEY_PREFIX = "product_size_";

export function getProductSizeConfigKey(productId: string) {
  return `${KEY_PREFIX}${productId}`;
}

function normalizeSizeLabel(raw: unknown) {
  return String(raw ?? "")
    .trim()
    .slice(0, 8);
}

function normalizeQty(raw: unknown) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed * 100) / 100);
}

export function normalizeProductSizeConfig(raw: unknown): ProductSizeConfig {
  const source = (raw ?? {}) as Record<string, unknown>;
  const enabled = Boolean(source.enabled ?? false);
  const optionsRaw = Array.isArray(source.options) ? source.options : [];
  const dedup = new Map<string, ProductSizeOption>();

  for (const item of optionsRaw) {
    const row = item as Record<string, unknown>;
    const size = normalizeSizeLabel(row.size).toUpperCase();
    const qty = normalizeQty(row.qty);
    if (!size && qty <= 0) continue;
    const dedupKey = size || "__NO_LABEL__";
    dedup.set(dedupKey, { size, qty });
  }

  return {
    enabled,
    options: Array.from(dedup.values()),
  };
}

async function loadProductSizeConfig(
  productId: string,
): Promise<ProductSizeConfig> {
  const key = getProductSizeConfigKey(productId);
  const row = await db.query.apiSettings.findFirst({
    where: eq(apiSettings.key, key),
  });
  return normalizeProductSizeConfig(row?.value);
}

export async function getProductSizeConfig(
  productId: string,
): Promise<ProductSizeConfig> {
  return withStorefrontCache(
    `sf:size:${productId}`,
    () => loadProductSizeConfig(productId),
    { tags: [CACHE_TAGS.sizeConfig] },
  );
}

async function loadProductSizeConfigsByProductIds(productIds: string[]) {
  const unique = [...new Set(productIds.filter(Boolean))];
  if (unique.length === 0) return new Map<string, ProductSizeConfig>();

  const keys = unique.map(getProductSizeConfigKey);
  const rows = await db
    .select({ key: apiSettings.key, value: apiSettings.value })
    .from(apiSettings)
    .where(inArray(apiSettings.key, keys));

  const map = new Map<string, ProductSizeConfig>();
  rows.forEach((row) => {
    const id = row.key.replace(KEY_PREFIX, "");
    map.set(id, normalizeProductSizeConfig(row.value));
  });
  return map;
}

export async function getProductSizeConfigsByProductIds(productIds: string[]) {
  const unique = [...new Set(productIds.filter(Boolean))].sort();
  if (unique.length === 0) return new Map<string, ProductSizeConfig>();

  const serialized = await withStorefrontCache(
    `sf:size:batch:${unique.join(",")}`,
    async () => {
      const map = await loadProductSizeConfigsByProductIds(unique);
      return Object.fromEntries(map.entries());
    },
    { tags: [CACHE_TAGS.sizeConfig] },
  );

  return new Map(Object.entries(serialized));
}

export async function upsertProductSizeConfig(params: {
  productId: string;
  config: ProductSizeConfig;
  updatedBy?: string | null;
}) {
  const key = getProductSizeConfigKey(params.productId);
  const normalized = normalizeProductSizeConfig(params.config);
  await db
    .insert(apiSettings)
    .values({
      key,
      value: normalized,
      isEnabled: normalized.enabled,
      updatedBy: params.updatedBy ?? null,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: apiSettings.key,
      set: {
        value: normalized,
        isEnabled: normalized.enabled,
        updatedBy: params.updatedBy ?? null,
        updatedAt: new Date().toISOString(),
      },
    });

  await invalidateStorefrontCache();
}
