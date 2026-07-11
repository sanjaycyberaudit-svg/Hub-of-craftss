/**
 * Normalize payment_meta from DB/drivers.
 * Legacy rows may be JSON-string scalars (drizzle 0.29 + postgres.js).
 * New writes use jsonRecordNullable and store real JSON objects.
 */
import { unwrapJsonRecord } from "@/lib/supabase/json-column";

export function readPaymentMeta(value: unknown): Record<string, unknown> {
  return unwrapJsonRecord(value) ?? {};
}

export function mergePaymentMeta(
  existing: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return { ...readPaymentMeta(existing), ...patch };
}
