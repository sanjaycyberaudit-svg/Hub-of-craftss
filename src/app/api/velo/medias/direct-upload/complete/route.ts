import { publicErrorMessage } from "@/lib/api/public-error";
import {
  requireVeloApiRequest,
  veloCorsHeaders,
  veloOptionsResponse,
} from "@/lib/integrations/velo-http";
import { finalizeDirectUpload } from "@/lib/storage/directUpload";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const completeSchema = z.object({
  storagePath: z.string().trim().min(1),
  fileName: z.string().trim().min(1).max(500),
});

export async function OPTIONS(request: NextRequest) {
  return veloOptionsResponse(request);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireVeloApiRequest(request);
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => null);
    const parsed = completeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid upload complete payload." },
        { status: 400, headers: veloCorsHeaders(request) },
      );
    }

    const result = await finalizeDirectUpload({
      storagePath: parsed.data.storagePath,
      originalFileName: parsed.data.fileName,
      purpose: "velo-product",
      auth: "trusted-server",
    });

    // No storefront bust here — product upsert/bulk will invalidate once.
    return NextResponse.json(
      {
        ok: true,
        mediaId: result.mediaId,
        key: result.key,
        fileName: result.fileName,
        featuredImageMediaId: result.mediaId,
      },
      { status: 201, headers: veloCorsHeaders(request) },
    );
  } catch (error) {
    console.error("[velo/medias/complete] failed:", error);
    const detail =
      error instanceof Error && error.message.trim()
        ? error.message
        : publicErrorMessage(error, "Could not finalize upload.");
    return NextResponse.json(
      { ok: false, message: detail },
      { status: 400, headers: veloCorsHeaders(request) },
    );
  }
}
