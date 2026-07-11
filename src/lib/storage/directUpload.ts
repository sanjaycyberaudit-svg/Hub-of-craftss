import { logServerError } from "@/lib/api/public-error";
import { UPLOAD_LIMIT_BYTES, UPLOAD_LIMIT_MB } from "@/lib/image/uploadLimits";
import { processUploadedImage } from "@/lib/image/processUpload";
import {
  createPresignedPutUrl,
  deleteObjects,
  getObjectBuffer,
} from "@/lib/s3";
import db from "@/lib/supabase/db";
import { medias } from "@/lib/supabase/schema";
import { nanoid } from "nanoid";
import {
  sanitizeExtension,
  sanitizeUploadFileName,
  toMediaAltText,
} from "./safeUploadFileName";
import { uploadMediaToR2 } from "./uploadMedia";

export type DirectUploadPurpose = "upload" | "product-draft";

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

export async function createDirectUploadSession(params: {
  fileName: string;
  contentType: string;
  fileSize: number;
}) {
  if (params.fileSize <= 0) {
    throw new Error("File is empty.");
  }
  if (params.fileSize > UPLOAD_LIMIT_BYTES) {
    throw new Error(`Each image must be ${UPLOAD_LIMIT_MB} MB or smaller.`);
  }
  if (!params.contentType.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }

  const storagePath = buildStagingPath(
    sanitizeUploadFileName(params.fileName),
  );

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
    signedUrl,
  };
}

export async function finalizeDirectUpload(params: {
  storagePath: string;
  originalFileName: string;
  purpose: DirectUploadPurpose;
}) {
  if (!isValidStagingPath(params.storagePath)) {
    throw new Error("Invalid staging path.");
  }

  let buffer: Buffer;
  try {
    buffer = await getObjectBuffer({ key: params.storagePath });
  } catch (error) {
    await deleteStagingFile(params.storagePath);
    throw error instanceof Error
      ? error
      : new Error("Uploaded file not found. Try uploading again.");
  }

  if (buffer.length === 0) {
    await deleteStagingFile(params.storagePath);
    throw new Error("Empty file.");
  }
  if (buffer.length > UPLOAD_LIMIT_BYTES) {
    await deleteStagingFile(params.storagePath);
    throw new Error(`Each image must be ${UPLOAD_LIMIT_MB} MB or smaller.`);
  }

  const safeName = sanitizeUploadFileName(params.originalFileName);
  const alt = toMediaAltText(params.originalFileName);
  const contentType = "application/octet-stream";
  const uploadFile = new File([buffer], safeName, {
    type: contentType,
  });

  let processed;
  try {
    processed = await processUploadedImage(uploadFile);
  } catch (error) {
    await deleteStagingFile(params.storagePath);
    throw error instanceof Error
      ? error
      : new Error("Image processing failed.");
  }

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
    await deleteStagingFile(params.storagePath);
    throw error instanceof Error ? error : new Error("Storage upload failed.");
  }

  const [insertedMedia] = await db
    .insert(medias)
    .values({ alt, key: finalKey })
    .returning({ id: medias.id });

  await deleteStagingFile(params.storagePath);

  return {
    mediaId: insertedMedia.id,
    key: finalKey,
    fileName: alt,
  };
}
