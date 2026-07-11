/**
 * Dashboard / admin catalog metrics count live product rows (SKUs).
 * Not inventory unit totals and not order-line sold quantities.
 */
export function isLiveCatalogProduct(row: {
  is_draft?: boolean | null;
  archived_at?: string | null;
}): boolean {
  return row.is_draft !== true && row.archived_at == null;
}
