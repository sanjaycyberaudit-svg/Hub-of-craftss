import { nanoid } from "nanoid";
import { env } from "@/env.mjs";
import { putObject } from "@/lib/s3";

export async function ensureMediaBucket() {
  // Legacy no-op: Supabase Storage is no longer required for new uploads.
  // Kept to avoid breaking older scripts that still call it.
}

export async function uploadMediaToR2(
  buffer: Buffer,
  contentType: string,
  extension: string,
  namePrefix = "upload",
): Promise<string> {
  const key = `uploads/${namePrefix}-${nanoid()}.${extension}`;

  await putObject({
    Bucket: env.NEXT_PUBLIC_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  return key;
}

/**
 * Back-compat alias: the codebase still imports this name in a few places.
 * New uploads now go to R2 (S3-compatible).
 */
export const uploadMediaToSupabase = uploadMediaToR2;
