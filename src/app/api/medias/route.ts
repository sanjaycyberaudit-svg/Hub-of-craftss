import {
  publicErrorMessage,
  publicValidationPayload,
} from "@/lib/api/public-error";
import { invalidateAdminMediaCache } from "@/lib/admin/media-library";
import { requireAdminApiUser } from "@/lib/auth/require-admin";
import { processUploadedImage } from "@/lib/image/processUpload";
import { uploadMediaToSupabase } from "@/lib/storage/uploadMedia";
import db from "@/lib/supabase/db";
import { medias } from "@/lib/supabase/schema";
import { mediaSchema } from "@/validations/medias";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function POST(request: NextRequest) {
  const auth = await requireAdminApiUser();
  if (auth.error) return auth.error;

  const formData = await request.formData();
  const data = Object.fromEntries(formData) as z.infer<typeof mediaSchema>;
  const validation = mediaSchema.safeParse(data);

  if (validation.success === false) {
    return NextResponse.json(
      publicValidationPayload("Invalid upload data.", validation.error),
      { status: 400 },
    );
  }

  const uploadedPaths: string[] = [];
  const errors: string[] = [];

  for (const file of Object.values(data)) {
    if (!file || !(file instanceof File)) continue;

    try {
      const processed = await processUploadedImage(file);
      const key = await uploadMediaToSupabase(
        processed.buffer,
        processed.contentType,
        processed.extension,
      );

      await db.insert(medias).values({ alt: file.name, key }).returning();

      uploadedPaths.push(file.name);
    } catch (err) {
      console.error("[medias] upload failed:", err);
      errors.push(`${file.name}: ${publicErrorMessage(err, "Upload failed.")}`);
    }
  }

  if (uploadedPaths.length === 0) {
    return NextResponse.json(
      { message: errors.join(" ") || "No images were uploaded." },
      { status: 400 },
    );
  }

  if (errors.length > 0) {
    invalidateAdminMediaCache();
    return NextResponse.json(
      { uploaded: uploadedPaths, errors },
      { status: 207 },
    );
  }

  invalidateAdminMediaCache();
  return NextResponse.json(uploadedPaths, { status: 201 });
}
