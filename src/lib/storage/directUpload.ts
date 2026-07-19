import { logServerError } from "@/lib/api/public-error";
import {
  STAGING_UPLOAD_LIMIT_BYTES,
  STAGING_UPLOAD_LIMIT_MB,
} from "@/lib/image/uploadLimits";
import {
  MAX_PROCESSED_IMAGE_BYTES,
  processUploadedImageBuffer,
} from "@/lib/image/processUpload";
import {
  createPresignedPutUrl,
  deleteObjects,
  getObjectBuffer,
  hasServerMediaWritePath,
  putObject,
} from "@/lib/s3";
import db from "@/lib/supabase/db";
import { medias } from "@/lib/supabase/schema";
import { env } from "@/env.mjs";
import { nanoid } from "nanoid";
import {
  sanitizeExtension,
  sanitizeUploadFileName,
  toMediaAltText,
} from "./safeUploadFileName";
import { uploadMediaToR2 } from "./uploadMedia";

export type DirectUploadPurpose = "upload" | "product-draft";
export type DirectUploadMode = "worker" | "presigned";

const STAGING_PREFIX = "uploads/staging/";

export { sanitizeExtension } from "./safeUploadFileName";

export function buildStagingPath(fileName: string): string {
  return `${STAGING_PREFIX}${nanoid()}.${sanitizeExtension(fileName)}`;
}

export function isValidStagingPath(path: string): boolean {
  if (!path.startsWith(STAGING_PREFIX)) return false;
  if (path.includes("..") || path.includes("\\")) return false;
  return /^uploads\/staging\/[A-Za-z0-9_-]+\.[a-z0-9]+$/i.test(path);
}

async function deleteStagingFile(storagePath: string) {
  await deleteObjects({ keys: [storagePath] });
}

async function hasMediaBucketBinding(): Promise<boolean> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env: cfEnv } = await getCloudflareContext({ async: true });
    return Boolean(
      (cfEnv as Record<string, unknown> | undefined)?.MEDIA_BUCKET,
    );
  } catch {
    return false;
  }
}

export async function createDirectUploadSession(params: {
  fileName: string;
  contentType: string;
  fileSize: number;
}) {
  if (params.fileSize <= 0) {
    throw new Error("File is empty.");
  }
  if (params.fileSize > STAGING_UPLOAD_LIMIT_BYTES) {
    throw new Error(
      `Each image must be ${STAGING_UPLOAD_LIMIT_MB} MB or smaller after compression.`,
    );
  }
  if (!params.contentType.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }

  const storagePath = buildStagingPath(sanitizeUploadFileName(params.fileName));

  // Prefer server staging (Worker R2 binding or Vercel→media-proxy).
  // Presigned S3 PUTs fail when R2 API tokens are stale (401 Unauthorized).
  if ((await hasMediaBucketBinding()) || hasServerMediaWritePath()) {
    return {
      storagePath,
      uploadMode: "worker" as DirectUploadMode,
      signedUrl: null as string | null,
    };
  }

  let signedUrl: string | null = null;
  let error: unknown = null;
  try {
    signedUrl = await createPresignedPutUrl({
      key: storagePath,
      contentType: params.contentType || "application/octet-stream",
      expiresInSeconds: 60 * 10,
    });
  } catch (err) {
    error = err;
  }

  if (!signedUrl) {
    logServerError("directUpload/createSession", error);
    throw new Error("Could not create upload session.");
  }

  return {
    storagePath,
    uploadMode: "presigned" as DirectUploadMode,
    signedUrl,
  };
}

/** Stage bytes into R2 via MEDIA_BUCKET (or local S3 fallback). */
export async function stageDirectUpload(params: {
  storagePath: string;
  body: ArrayBuffer | Uint8Array | Buffer;
  contentType: string;
}) {
  if (!isValidStagingPath(params.storagePath)) {
    throw new Error("Invalid staging path.");
  }
  if (!params.contentType.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }
  const size =
    params.body instanceof ArrayBuffer
      ? params.body.byteLength
      : params.body.byteLength;
  if (size <= 0) {
    throw new Error("File is empty.");
  }
  if (size > STAGING_UPLOAD_LIMIT_BYTES) {
    throw new Error(
      `Each image must be ${STAGING_UPLOAD_LIMIT_MB} MB or smaller after compression.`,
    );
  }

  await putObject({
    Bucket: env.NEXT_PUBLIC_S3_BUCKET,
    Key: params.storagePath,
    Body: params.body,
    ContentType: params.contentType || "application/octet-stream",
  });

  return { storagePath: params.storagePath };
}

export async function finalizeDirectUpload(params: {
  storagePath: string;
  originalFileName: string;
  purpose: DirectUploadPurpose;
}) {
  if (!isValidStagingPath(params.storagePath)) {
    throw new Error("Invalid staging path.");
  }

  const stagingKey = params.storagePath;
  let buffer: Buffer;
  try {
    buffer = await getObjectBuffer({
      key: stagingKey,
      maxBytes: MAX_PROCESSED_IMAGE_BYTES,
    });
  } catch (error) {
    await deleteStagingFile(stagingKey);
    throw error instanceof Error
      ? error
      : new Error("Uploaded file not found. Try uploading again.");
  }

  if (buffer.length === 0) {
    await deleteStagingFile(stagingKey);
    throw new Error("Empty file.");
  }
  if (buffer.length > MAX_PROCESSED_IMAGE_BYTES) {
    await deleteStagingFile(stagingKey);
    throw new Error(
      "Image is too large after upload. Compress under 1 MB and retry.",
    );
  }

  const safeName = sanitizeUploadFileName(params.originalFileName);
  const alt = toMediaAltText(params.originalFileName);

  let processed;
  try {
    processed = await processUploadedImageBuffer(buffer, safeName);
  } catch (error) {
    await deleteStagingFile(stagingKey);
    throw error instanceof Error
      ? error
      : new Error("Image processing failed.");
  }
  // Release staging buffer reference before the final put.
  buffer = Buffer.alloc(0);

  const namePrefix =
    params.purpose === "product-draft" ? "product-draft" : "upload";

  let finalKey: string;
  try {
    finalKey = await uploadMediaToR2(
      processed.buffer,
      processed.contentType,
      processed.extension,
      namePrefix,
    );
  } catch (error) {
    await deleteStagingFile(stagingKey);
    throw error instanceof Error ? error : new Error("Storage upload failed.");
  }

  const [insertedMedia] = await db
    .insert(medias)
    .values({ alt, key: finalKey })
    .returning({ id: medias.id });

  await deleteStagingFile(stagingKey);

  return {
    mediaId: insertedMedia.id,
    key: finalKey,
    fileName: alt,
  };
}
