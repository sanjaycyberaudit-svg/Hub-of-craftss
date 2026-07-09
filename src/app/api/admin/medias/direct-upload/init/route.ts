import { publicErrorMessage } from "@/lib/api/public-error";
import { getSessionUser, isAdminUser } from "@/lib/auth/admin";
import {
  createDirectUploadSession,
  type DirectUploadPurpose,
} from "@/lib/storage/directUpload";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const initSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(128),
  fileSize: z.number().int().positive(),
  purpose: z.enum(["upload", "product-draft"]).default("upload"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const isAdmin = await isAdminUser(user);
    if (!user || !isAdmin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = initSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid upload init payload." },
        { status: 400 },
      );
    }

    const session = await createDirectUploadSession({
      fileName: parsed.data.fileName,
      contentType: parsed.data.contentType,
      fileSize: parsed.data.fileSize,
    });

    return NextResponse.json(
      {
        ...session,
        purpose: parsed.data.purpose as DirectUploadPurpose,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[direct-upload/init] failed:", error);
    return NextResponse.json(
      {
        message: publicErrorMessage(error, "Could not start upload."),
      },
      { status: 400 },
    );
  }
}
