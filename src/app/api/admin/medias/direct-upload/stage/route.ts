import { publicErrorMessage } from "@/lib/api/public-error";
import { getSessionUser, isAdminUser } from "@/lib/auth/admin";
import {
  isValidStagingPath,
  stageDirectUpload,
} from "@/lib/storage/directUpload";
import { STAGING_UPLOAD_LIMIT_BYTES } from "@/lib/image/uploadLimits";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const isAdmin = await isAdminUser(user);
    if (!user || !isAdmin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const storagePath = String(form.get("storagePath") || "").trim();
    const file = form.get("file");

    if (!isValidStagingPath(storagePath)) {
      return NextResponse.json(
        { message: "Invalid staging path." },
        { status: 400 },
      );
    }
    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Missing upload file." },
        { status: 400 },
      );
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { message: "Only image files are allowed." },
        { status: 400 },
      );
    }
    if (file.size <= 0 || file.size > STAGING_UPLOAD_LIMIT_BYTES) {
      return NextResponse.json(
        { message: "File size is not allowed." },
        { status: 400 },
      );
    }

    await stageDirectUpload({
      storagePath,
      body: await file.arrayBuffer(),
      contentType: file.type || "application/octet-stream",
    });

    return NextResponse.json({ ok: true, storagePath }, { status: 201 });
  } catch (error) {
    console.error("[direct-upload/stage] failed:", error);
    const detail =
      error instanceof Error && error.message.trim()
        ? error.message
        : publicErrorMessage(error, "Could not stage upload.");
    return NextResponse.json({ message: detail }, { status: 400 });
  }
}
