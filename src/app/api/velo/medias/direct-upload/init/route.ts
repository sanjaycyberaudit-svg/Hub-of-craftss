import { publicErrorMessage } from "@/lib/api/public-error";
import {
  requireVeloApiRequest,
  veloCorsHeaders,
  veloOptionsResponse,
} from "@/lib/integrations/velo-http";
import { createDirectUploadSession } from "@/lib/storage/directUpload";
import { sanitizeUploadFileName } from "@/lib/storage/safeUploadFileName";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const initSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .transform((value) => sanitizeUploadFileName(value)),
  contentType: z.string().trim().min(1).max(128),
  fileSize: z.number().int().positive(),
});

export async function OPTIONS(request: NextRequest) {
  return veloOptionsResponse(request);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireVeloApiRequest(request);
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => null);
    const parsed = initSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid upload init payload." },
        { status: 400, headers: veloCorsHeaders(request) },
      );
    }

    const session = await createDirectUploadSession({
      fileName: parsed.data.fileName,
      contentType: parsed.data.contentType,
      fileSize: parsed.data.fileSize,
      auth: "trusted-server",
      preferProxyUpload: true,
    });

    return NextResponse.json(
      {
        ok: true,
        purpose: "velo-product",
        ...session,
      },
      { status: 201, headers: veloCorsHeaders(request) },
    );
  } catch (error) {
    console.error("[velo/medias/init] failed:", error);
    const detail =
      error instanceof Error && error.message.trim()
        ? error.message
        : publicErrorMessage(error, "Could not start upload.");
    return NextResponse.json(
      { ok: false, message: detail },
      { status: 400, headers: veloCorsHeaders(request) },
    );
  }
}
