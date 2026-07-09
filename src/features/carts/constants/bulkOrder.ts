export const BULK_ORDER_MIN_QTY = 9;

export function isBulkOrderQuantity(
  quantity: number,
  threshold: number = BULK_ORDER_MIN_QTY,
): boolean {
  return quantity >= threshold;
}
