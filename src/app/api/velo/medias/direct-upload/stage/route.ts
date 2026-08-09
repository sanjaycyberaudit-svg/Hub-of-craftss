import { publicErrorMessage } from "@/lib/api/public-error";
import {
  requireVeloApiRequest,
  veloCorsHeaders,
  veloOptionsResponse,
} from "@/lib/integrations/velo-http";
import { STAGING_UPLOAD_LIMIT_BYTES } from "@/lib/image/uploadLimits";
import {
  isValidStagingPath,
  stageDirectUpload,
} from "@/lib/storage/directUpload";
import { NextRequest, NextResponse } from "next/server";

export async function OPTIONS(request: NextRequest) {
  return veloOptionsResponse(request);
}

/**
 * Fallback when uploadMode is "worker" (proxy token unavailable).
 * Prefer init → PUT media proxy with uploadToken.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireVeloApiRequest(request);
    if (!auth.ok) return auth.response;

    const form = await request.formData();
    const storagePath = String(form.get("storagePath") || "").trim();
    const file = form.get("file");

    if (!isValidStagingPath(storagePath)) {
      return NextResponse.json(
        { ok: false, message: "Invalid staging path." },
        { status: 400, headers: veloCorsHeaders(request) },
      );
    }
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, message: "Missing upload file." },
        { status: 400, headers: veloCorsHeaders(request) },
      );
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, message: "Only image files are allowed." },
        { status: 400, headers: veloCorsHeaders(request) },
      );
    }
    if (file.size <= 0 || file.size > STAGING_UPLOAD_LIMIT_BYTES) {
      return NextResponse.json(
        { ok: false, message: "File size is not allowed." },
        { status: 400, headers: veloCorsHeaders(request) },
      );
    }

    await stageDirectUpload({
      storagePath,
      body: await file.arrayBuffer(),
      contentType: file.type || "application/octet-stream",
      auth: "trusted-server",
    });

    return NextResponse.json(
      { ok: true, storagePath },
      { status: 201, headers: veloCorsHeaders(request) },
    );
  } catch (error) {
    console.error("[velo/medias/stage] failed:", error);
    const detail =
      error instanceof Error && error.message.trim()
        ? error.message
        : publicErrorMessage(error, "Could not stage upload.");
    return NextResponse.json(
      { ok: false, message: detail },
      { status: 400, headers: veloCorsHeaders(request) },
    );
  }
}
