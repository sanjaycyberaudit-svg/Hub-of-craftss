/** GraphQL cart delete/update responses expose affectedCount — 0 means nothing changed. */
export function readGraphqlAffectedCount(
  payload: { affectedCount?: number | null } | null | undefined,
): number {
  const count = Number(payload?.affectedCount ?? 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

export function readRemoveCartAffectedCount(data: {
  deleteFromcartsCollection?: { affectedCount?: number | null } | null;
} | null | undefined): number {
  return readGraphqlAffectedCount(data?.deleteFromcartsCollection ?? null);
}

export function readUpdateCartAffectedCount(data: {
  updatecartsCollection?: { affectedCount?: number | null } | null;
} | null | undefined): number {
  return readGraphqlAffectedCount(data?.updatecartsCollection ?? null);
}
