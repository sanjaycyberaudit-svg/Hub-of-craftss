/**
 * Drizzle 0.29 + postgres.js double-encodes `json()` columns:
 * Drizzle JSON.stringify → postgres.js stores a JSON *string* scalar.
 *
 * Use these custom types so objects/arrays are written once as real JSON,
 * and legacy string-encoded rows are still readable.
 */
import { customType } from "drizzle-orm/pg-core";

/** Unwrap accidental JSON-string scalars (and rare double-encoding). */
export function unwrapJsonValue(value: unknown): unknown {
  if (value == null) return value;

  let current: unknown = value;
  for (let i = 0; i < 3; i++) {
    if (typeof current !== "string") break;
    const trimmed = current.trim();
    if (!trimmed) return null;
    try {
      current = JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return current;
}

export function unwrapJsonRecord(
  value: unknown,
): Record<string, unknown> | null {
  const unwrapped = unwrapJsonValue(value);
  if (unwrapped == null) return null;
  if (typeof unwrapped !== "object" || Array.isArray(unwrapped)) return null;
  return unwrapped as Record<string, unknown>;
}

/** JSON object column — pass JS objects through; let postgres.js serialize once. */
export const jsonRecord = customType<{
  data: Record<string, unknown>;
  driverData: unknown;
}>({
  dataType() {
    return "json";
  },
  toDriver(value: Record<string, unknown>) {
    return value;
  },
  fromDriver(value: unknown): Record<string, unknown> {
    return unwrapJsonRecord(value) ?? {};
  },
});

/** Nullable JSON object column (e.g. orders.payment_meta). */
export const jsonRecordNullable = customType<{
  data: Record<string, unknown> | null;
  driverData: unknown;
}>({
  dataType() {
    return "json";
  },
  toDriver(value: Record<string, unknown> | null) {
    return value;
  },
  fromDriver(value: unknown): Record<string, unknown> | null {
    if (value == null) return null;
    return unwrapJsonRecord(value);
  },
});

/** JSON string-array column (e.g. products.tags / images). */
export const jsonStringArray = customType<{
  data: string[];
  driverData: unknown;
}>({
  dataType() {
    return "json";
  },
  toDriver(value: string[]) {
    return value;
  },
  fromDriver(value: unknown): string[] {
    const unwrapped = unwrapJsonValue(value);
    if (!Array.isArray(unwrapped)) return [];
    return unwrapped.map((item) => String(item));
  },
});
