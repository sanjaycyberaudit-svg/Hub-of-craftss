/**
 * Velo /api/velo/products cache policy.
 *
 * - Reads never bust storefront cache (list/meta/resolveImages).
 * - Collection mutations invalidate inside the handler (scoped).
 * - Product mutations rely on a single route-level invalidate (not doubled).
 */

export const VELO_READ_ACTIONS = ["list", "meta", "resolveImages"] as const;

export const VELO_COLLECTION_MUTATION_ACTIONS = [
  "upsertCollection",
  "deleteCollection",
] as const;

export const VELO_PRODUCT_MUTATION_ACTIONS = [
  "upsert",
  "bulk_upsert",
  "delete",
] as const;

export type VeloCacheAction = string;

/** Actions that must not be idempotency-cached (batched / must re-run). */
export function veloActionSkipsIdempotency(action: VeloCacheAction): boolean {
  return action === "resolveImages" || action === "deleteCollection";
}

/**
 * Whether `/api/velo/products` should bust the full storefront cache.
 * Collection actions already call a scoped invalidate in the handler — skip here
 * to avoid double Redis KEYS scans (Fluid Active CPU).
 */
export function veloActionNeedsRouteCacheInvalidation(
  action: VeloCacheAction,
): boolean {
  return (VELO_PRODUCT_MUTATION_ACTIONS as readonly string[]).includes(action);
}
