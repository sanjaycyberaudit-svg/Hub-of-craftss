import type { ZodError } from "zod";

const isProduction = process.env.NODE_ENV === "production";

/** Safe client-facing message — hides internal details in production. */
export function publicErrorMessage(error: unknown, fallback: string): string {
  if (!isProduction && error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

/** Log full error server-side (Vercel/server logs). Never send this to clients. */
export function logServerError(
  tag: string,
  error: unknown,
  extra?: Record<string, unknown>,
) {
  if (extra) {
    console.error(`[${tag}]`, error, extra);
    return;
  }
  console.error(`[${tag}]`, error);
}

/** Zod details for admin forms — omitted in production to avoid schema disclosure. */
export function publicValidationPayload(message: string, zodError: ZodError) {
  return {
    message,
    ...(isProduction ? {} : { error: zodError.flatten() }),
  };
}
