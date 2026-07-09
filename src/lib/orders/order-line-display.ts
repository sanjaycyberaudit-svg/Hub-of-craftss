export type OrderLineDisplayFields = {
  productName?: string | null;
  productSlug?: string | null;
  productCode?: string | null;
  imageKey?: string | null;
  imageAlt?: string | null;
  productNameSnapshot?: string | null;
  productSlugSnapshot?: string | null;
  productCodeSnapshot?: string | null;
  productImageKeySnapshot?: string | null;
};

export function resolveOrderLineProductName(
  row: OrderLineDisplayFields,
): string {
  return (
    String(row.productName ?? row.productNameSnapshot ?? "").trim() || "Product"
  );
}

export function resolveOrderLineProductSlug(
  row: OrderLineDisplayFields,
): string | null {
  const slug = String(row.productSlug ?? row.productSlugSnapshot ?? "").trim();
  return slug || null;
}

export function resolveOrderLineProductCode(
  row: OrderLineDisplayFields,
): string | null {
  const code = String(row.productCode ?? row.productCodeSnapshot ?? "").trim();
  return code || null;
}

export function resolveOrderLineImageKey(
  row: OrderLineDisplayFields,
): string | null {
  const key = String(row.imageKey ?? row.productImageKeySnapshot ?? "").trim();
  return key || null;
}

export function resolveOrderLineImageAlt(row: OrderLineDisplayFields): string {
  return (
    String(row.imageAlt ?? "").trim() ||
    resolveOrderLineProductName(row) ||
    "Product image"
  );
}
