export function readPaymentMeta(
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return value ?? {};
}

export function mergePaymentMeta(
  existing: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return { ...readPaymentMeta(existing), ...patch };
}
