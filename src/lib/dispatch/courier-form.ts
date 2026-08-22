import { z } from "zod";
import { slugify } from "@/lib/utils";
import { buildCourierTrackingUrl } from "./courier-tracking-url";

export const DISPATCH_COURIER_NAME_MIN = 2;
export const DISPATCH_COURIER_NAME_MAX = 191;

export function normalizeCourierName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function validateTrackingUrlTemplate(
  template: string | null | undefined,
): string | null {
  const normalized = template?.trim();
  if (!normalized) return null;
  if (!buildCourierTrackingUrl(normalized, "TEST123")) {
    throw new Error(
      "Enter a valid http(s) tracking URL. Use {tracking} where the number goes.",
    );
  }
  return normalized;
}

export const createDispatchCourierSchema = z.object({
  name: z
    .string()
    .trim()
    .min(DISPATCH_COURIER_NAME_MIN)
    .max(DISPATCH_COURIER_NAME_MAX)
    .transform(normalizeCourierName)
    .refine((name) => /[\p{L}\p{N}]/u.test(name), {
      message: "Courier name must include letters or numbers.",
    }),
  trackingUrlTemplate: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value === "" ? null : value)),
});

export function parseCreateDispatchCourierPayload(payload: unknown):
  | {
      success: true;
      data: { name: string; trackingUrlTemplate: string | null };
    }
  | { success: false; error: z.ZodError } {
  const parsed = createDispatchCourierSchema.safeParse(payload);
  if (parsed.success === false) {
    return { success: false, error: parsed.error };
  }
  try {
    return {
      success: true,
      data: {
        name: parsed.data.name,
        trackingUrlTemplate: validateTrackingUrlTemplate(
          parsed.data.trackingUrlTemplate,
        ),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: "custom",
          path: ["trackingUrlTemplate"],
          message:
            error instanceof Error
              ? error.message
              : "Invalid tracking URL template.",
        },
      ]),
    };
  }
}

export function courierNameToIdBase(name: string) {
  return slugify(normalizeCourierName(name)).replace(/-/g, "") || "courier";
}
