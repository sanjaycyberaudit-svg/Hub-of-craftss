export function assertProductsArePublished(
  productNamesById: Map<string, string>,
  unpublishedIds: string[],
): void {
  if (unpublishedIds.length === 0) return;

  const label =
    productNamesById.get(unpublishedIds[0]!) ??
    unpublishedIds[0] ??
    "A product";
  throw new Error(
    `${label} is no longer available. Please remove it from your cart and try again.`,
  );
}
