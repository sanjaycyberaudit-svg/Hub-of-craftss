/**
 * Classify delete targets without I/O — missing ids are already-gone (idempotent),
 * paid-order links archive, everything else hard-deletes.
 */
export function classifyProductDeleteTargets(
  productIds: string[],
  existingIds: Set<string>,
  paidLinked: Set<string>,
): {
  toDelete: string[];
  toArchive: string[];
  alreadyGoneIds: string[];
} {
  const uniqueIds = [...new Set(productIds)];
  const toDelete: string[] = [];
  const toArchive: string[] = [];
  const alreadyGoneIds: string[] = [];

  for (const id of uniqueIds) {
    if (!existingIds.has(id)) {
      alreadyGoneIds.push(id);
      continue;
    }
    if (paidLinked.has(id)) {
      toArchive.push(id);
    } else {
      toDelete.push(id);
    }
  }

  return { toDelete, toArchive, alreadyGoneIds };
}
