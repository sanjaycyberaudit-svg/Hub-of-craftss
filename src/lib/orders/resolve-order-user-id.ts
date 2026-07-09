/** Persist checkout orders against the signed-in account whenever a session exists. */
export function resolveOrderUserId(
  sessionUserId: string | null | undefined,
): string | null {
  return sessionUserId ?? null;
}
