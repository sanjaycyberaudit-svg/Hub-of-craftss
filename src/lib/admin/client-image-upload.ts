import {
  STAGING_UPLOAD_LIMIT_BYTES,
  STAGING_UPLOAD_LIMIT_MB,
  UPLOAD_LIMIT_BYTES,
  UPLOAD_LIMIT_MB,
} from "@/lib/image/uploadLimits";
import { MAX_PROCESSED_IMAGE_BYTES } from "@/lib/image/processUpload";
import { fetchWithTimeout } from "@/lib/network/fetchWithTimeout";
import {
  sanitizeUploadFileName,
  withSafeUploadFile,
} from "@/lib/storage/safeUploadFileName";

/** Soft ceiling for FormData fallback through the Worker. */
export const VERCEL_SAFE_REQUEST_BYTES = 1.25 * 1024 * 1024;

/**
 * Low-memory WebP for Workers: keep edge high enough to stay sharp on product
 * pages, then drop quality / edge only until we hit the byte target.
 */
export const CLIENT_PREPROCESS_MAX_EDGE = 1600;
export const CLIENT_AGGRESSIVE_MAX_EDGE = 1280;
export const CLIENT_MIN_EDGE = 1100;
export const CLIENT_TARGET_IMAGE_BYTES = 650 * 1024;
/** Prefer higher quality first so images stay sharp at ~650 KB. */
export const CLIENT_QUALITY_STEPS = [0.84, 0.8, 0.76, 0.72, 0.68] as const;
export const CLIENT_EDGE_STEPS = [
  CLIENT_PREPROCESS_MAX_EDGE,
  CLIENT_AGGRESSIVE_MAX_EDGE,
  CLIENT_MIN_EDGE,
] as const;
export const MAX_UPLOAD_RETRIES = 3;
export const UPLOAD_RETRY_DELAY_MS = 400;
export const UPLOAD_REQUEST_TIMEOUT_MS = 45000;
export const DIRECT_UPLOAD_COMPLETE_TIMEOUT_MS = 90000;
export const BETWEEN_UPLOAD_DELAY_MS = 120;

export type DirectUploadPurpose = "upload" | "product-draft";

export { UPLOAD_LIMIT_BYTES, UPLOAD_LIMIT_MB };

export type FileValidationError = {
  fileName: string;
  reason: string;
  file?: File;
};

export type UploadFileFailure = {
  fileName: string;
  reason: string;
  file: File;
};

export type UploadProgressPhase =
  | "validating"
  | "preparing"
  | "uploading"
  | "complete";

export type UploadProgressUpdate = {
  phase: UploadProgressPhase;
  current: number;
  total: number;
  percent: number;
  message: string;
};

export type PreparedUploadItem = {
  sourceName: string;
  file: File;
  /** Original picker file before client compression (for preview cleanup). */
  sourceFile: File;
};

/** Stable key for matching a picker file to its upload preview tile. */
export function uploadFileIdentityKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export type MediaUploadResult = {
  uploadedCount: number;
  uploadedNames: string[];
  failures: UploadFileFailure[];
  validationErrors: FileValidationError[];
};

export type BulkDraftPayload = {
  message?: string;
  created: {
    id: string;
    productCode: string;
    name: string;
    slug: string;
  }[];
  errors: string[];
};

export type BulkDraftRequestResult = {
  payload: BulkDraftPayload;
  status: number;
  isRequestTooLarge: boolean;
};

export type BulkDraftUploadResult = {
  created: BulkDraftPayload["created"];
  errors: string[];
  failures: UploadFileFailure[];
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function replaceExt(fileName: string, ext: string) {
  return sanitizeUploadFileName(fileName.replace(/\.[^/.]+$/, "") + ext);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Only image files are allowed.";
  }
  if (file.size === 0) {
    return "File is empty.";
  }
  if (file.size > UPLOAD_LIMIT_BYTES) {
    return `File is ${formatFileSize(file.size)}. Maximum is ${UPLOAD_LIMIT_MB} MB per image. Resize on your computer and try again.`;
  }
  return null;
}

export function validateImageFiles(files: File[]): {
  valid: File[];
  rejected: FileValidationError[];
} {
  const valid: File[] = [];
  const rejected: FileValidationError[] = [];

  for (const file of files) {
    const reason = validateImageFile(file);
    if (reason) {
      rejected.push({
        fileName: sanitizeUploadFileName(file.name),
        reason: `${sanitizeUploadFileName(file.name)}: ${reason}`,
        file,
      });
    } else {
      valid.push(file);
    }
  }

  return { valid, rejected };
}

async function canvasCompressAtEdge(
  image: HTMLImageElement,
  file: File,
  maxEdge: number,
): Promise<{ blob: Blob; quality: number } | null> {
  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;
  if (!originalWidth || !originalHeight) return null;

  const scale = Math.min(1, maxEdge / Math.max(originalWidth, originalHeight));
  const targetWidth = Math.max(1, Math.round(originalWidth * scale));
  const targetHeight = Math.max(1, Math.round(originalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  let best: { blob: Blob; quality: number } | null = null;
  for (const quality of CLIENT_QUALITY_STEPS) {
    // eslint-disable-next-line no-await-in-loop
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (!blob) continue;
    if (!best || blob.size < best.blob.size) best = { blob, quality };
    if (blob.size <= CLIENT_TARGET_IMAGE_BYTES) {
      return { blob, quality };
    }
  }
  return best;
}

async function canvasCompress(file: File): Promise<File | null> {
  if (!file.type.startsWith("image/")) return null;
  if (file.type === "image/gif") return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unsupported image format."));
      img.src = objectUrl;
    });

    let bestUnderCap: Blob | null = null;
    let smallest: Blob | null = null;

    for (const maxEdge of CLIENT_EDGE_STEPS) {
      // eslint-disable-next-line no-await-in-loop
      const result = await canvasCompressAtEdge(image, file, maxEdge);
      if (!result) continue;
      if (!smallest || result.blob.size < smallest.size) {
        smallest = result.blob;
      }
      if (result.blob.size <= CLIENT_TARGET_IMAGE_BYTES) {
        bestUnderCap = result.blob;
        break;
      }
      if (
        result.blob.size <= VERCEL_SAFE_REQUEST_BYTES &&
        (!bestUnderCap || result.blob.size < bestUnderCap.size)
      ) {
        bestUnderCap = result.blob;
      }
    }

    const chosen = bestUnderCap ?? smallest;
    if (!chosen) return null;

    return new File([chosen], replaceExt(file.name, ".webp"), {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function compressImageForUpload(file: File): Promise<File> {
  const compressed = await canvasCompress(file);
  if (!compressed) return file;

  // Always prefer the WebP result when it fits Worker limits (even if a tiny
  // JPEG was somehow smaller — we need consistent low-memory WebP in R2).
  if (compressed.size <= VERCEL_SAFE_REQUEST_BYTES) return compressed;
  if (compressed.size < file.size) return compressed;
  return file;
}

function postCompressRejectReason(
  file: File,
  sourceName: string,
): string | null {
  if (file.size > UPLOAD_LIMIT_BYTES) {
    return `${sourceName}: still ${formatFileSize(file.size)} after compression. Resize to 1600px and under ${UPLOAD_LIMIT_MB} MB on your computer.`;
  }
  if (file.size > MAX_PROCESSED_IMAGE_BYTES) {
    return `${sourceName}: ${formatFileSize(file.size)} is still too large after compression (max ${formatFileSize(MAX_PROCESSED_IMAGE_BYTES)}). Use a simpler photo or resize on your computer.`;
  }
  if (file.size > STAGING_UPLOAD_LIMIT_BYTES) {
    return `${sourceName}: ${formatFileSize(file.size)} exceeds the ${STAGING_UPLOAD_LIMIT_MB} MB upload limit. Compress and retry.`;
  }
  return null;
}

export async function prepareImageFiles(
  files: File[],
  onProgress?: (current: number, total: number, fileName: string) => void,
): Promise<{
  prepared: PreparedUploadItem[];
  rejected: FileValidationError[];
}> {
  const { valid, rejected } = validateImageFiles(files);
  const prepared: PreparedUploadItem[] = [];

  for (let index = 0; index < valid.length; index += 1) {
    const source = valid[index];
    onProgress?.(index + 1, valid.length, source.name);

    // eslint-disable-next-line no-await-in-loop
    const compressed = await compressImageForUpload(source);
    const rejectReason = postCompressRejectReason(compressed, source.name);
    if (rejectReason) {
      rejected.push({
        fileName: source.name,
        reason: rejectReason,
        file: source,
      });
      continue;
    }

    prepared.push({
      sourceName: sanitizeUploadFileName(source.name),
      file: withSafeUploadFile(compressed).file,
      sourceFile: source,
    });
  }

  return { prepared, rejected };
}

/** Validate + compress for Cloudflare Workers (no server-side sharp). */
export async function prepareImageFilesForDirect(
  files: File[],
  onProgress?: (current: number, total: number, fileName: string) => void,
): Promise<{
  prepared: PreparedUploadItem[];
  rejected: FileValidationError[];
}> {
  // Direct R2 staging finalizes on the Worker — aim for ~650 KB sharp WebP.
  return prepareImageFiles(files, onProgress);
}

function buildProgress(
  phase: UploadProgressPhase,
  current: number,
  total: number,
  message: string,
): UploadProgressUpdate {
  const safeTotal = Math.max(1, total);
  const ratio = current / safeTotal;
  let percent = 1;

  if (phase === "validating") {
    percent = Math.round(ratio * 8);
  } else if (phase === "preparing") {
    percent = Math.round(8 + ratio * 42);
  } else if (phase === "uploading") {
    percent = Math.round(50 + ratio * 45);
  } else {
    percent = 99;
  }

  return {
    phase,
    current,
    total,
    percent: Math.max(1, Math.min(99, percent)),
    message,
  };
}

type MediaApiResponse = {
  status: number;
  uploaded: string[];
  errors: string[];
  message: string;
  isRequestTooLarge: boolean;
};

async function uploadViaDirectStorage(
  file: File,
  displayName: string,
  purpose: DirectUploadPurpose = "upload",
): Promise<{
  ok: boolean;
  uploadedName?: string;
  mediaId?: string;
  reason?: string;
}> {
  const safeDisplayName = sanitizeUploadFileName(displayName || file.name);
  const safeFile =
    file.name === safeDisplayName
      ? file
      : new File([file], safeDisplayName, {
          type: file.type,
          lastModified: file.lastModified,
        });
  let lastError = "Direct upload failed.";

  for (let attempt = 0; attempt < MAX_UPLOAD_RETRIES; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const initRes = await fetchWithTimeout(
        "/api/admin/medias/direct-upload/init",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: safeDisplayName,
            contentType: safeFile.type || "application/octet-stream",
            fileSize: safeFile.size,
            purpose,
          }),
          timeoutMs: UPLOAD_REQUEST_TIMEOUT_MS,
        },
      );

      if (!initRes.ok) {
        const payload = (await initRes.json().catch(() => ({}))) as {
          message?: string;
        };
        lastError = payload.message ?? `Init failed (${initRes.status}).`;
        if (initRes.status < 500) break;
        // eslint-disable-next-line no-continue
        continue;
      }

      const init = (await initRes.json()) as {
        storagePath: string;
        signedUrl?: string | null;
        uploadMode?: "worker" | "presigned";
      };

      let putOk = false;
      if (init.uploadMode === "worker" || !init.signedUrl) {
        const stageData = new FormData();
        stageData.append("storagePath", init.storagePath);
        stageData.append("file", safeFile);
        // eslint-disable-next-line no-await-in-loop
        const stageRes = await fetchWithTimeout(
          "/api/admin/medias/direct-upload/stage",
          {
            method: "POST",
            body: stageData,
            timeoutMs: UPLOAD_REQUEST_TIMEOUT_MS,
          },
        );
        putOk = stageRes.ok;
        if (!putOk) {
          const payload = (await stageRes.json().catch(() => ({}))) as {
            message?: string;
          };
          lastError =
            payload.message ?? `Storage upload failed (${stageRes.status}).`;
        }
      } else {
        // eslint-disable-next-line no-await-in-loop
        const putRes = await fetch(init.signedUrl, {
          method: "PUT",
          body: safeFile,
          // Do not set Content-Type: presigned URL is signed without it (R2 browser PUT).
        });
        putOk = putRes.ok;
        if (!putOk) {
          lastError = `Storage upload failed (${putRes.status}).`;
        }
      }

      if (!putOk) {
        // eslint-disable-next-line no-continue
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const completeRes = await fetchWithTimeout(
        "/api/admin/medias/direct-upload/complete",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storagePath: init.storagePath,
            fileName: safeDisplayName,
            purpose,
          }),
          timeoutMs: DIRECT_UPLOAD_COMPLETE_TIMEOUT_MS,
        },
      );

      if (!completeRes.ok) {
        const payload = (await completeRes.json().catch(() => ({}))) as {
          message?: string;
        };
        lastError =
          payload.message ?? `Finalize failed (${completeRes.status}).`;
        if (completeRes.status < 500) break;
        // eslint-disable-next-line no-continue
        continue;
      }

      const completed = (await completeRes.json()) as {
        fileName: string;
        mediaId: string;
      };

      return {
        ok: true,
        uploadedName: completed.fileName,
        mediaId: completed.mediaId,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }

    if (attempt < MAX_UPLOAD_RETRIES - 1) {
      // eslint-disable-next-line no-await-in-loop
      await delay(UPLOAD_RETRY_DELAY_MS * (attempt + 1));
    }
  }

  return { ok: false, reason: `${safeDisplayName}: ${lastError}` };
}

async function postMediaOnce(file: File): Promise<MediaApiResponse> {
  const formData = new FormData();
  formData.append("files[0]", file);

  let response: Response | null = null;
  let attempts = 0;

  while (attempts < MAX_UPLOAD_RETRIES) {
    try {
      // eslint-disable-next-line no-await-in-loop
      response = await fetchWithTimeout("/api/medias", {
        method: "POST",
        body: formData,
        timeoutMs: UPLOAD_REQUEST_TIMEOUT_MS,
      });
      if (response.status < 500) break;
    } catch {
      // retry transient failures
    }
    attempts += 1;
    if (attempts < MAX_UPLOAD_RETRIES) {
      // eslint-disable-next-line no-await-in-loop
      await delay(UPLOAD_RETRY_DELAY_MS * attempts);
    }
  }

  if (!response) {
    return {
      status: 503,
      uploaded: [],
      errors: ["Upload request failed after retries."],
      message: "Upload request failed after retries.",
      isRequestTooLarge: false,
    };
  }

  const raw = await response.text();
  let payload:
    | string[]
    | { message?: string; uploaded?: string[]; errors?: string[] }
    | null = null;

  try {
    payload = JSON.parse(raw) as
      | string[]
      | { message?: string; uploaded?: string[]; errors?: string[] };
  } catch {
    payload = null;
  }

  const isRequestTooLarge =
    response.status === 413 || /request entity too large/i.test(raw);

  if (Array.isArray(payload)) {
    return {
      status: response.status,
      uploaded: payload,
      errors: [],
      message: "",
      isRequestTooLarge,
    };
  }

  return {
    status: response.status,
    uploaded: payload?.uploaded ?? [],
    errors: payload?.errors ?? [],
    message: payload?.message ?? "",
    isRequestTooLarge,
  };
}

export async function uploadSingleMediaFile(
  file: File,
  displayName = file.name,
  options?: { purpose?: DirectUploadPurpose; preferDirect?: boolean },
): Promise<{
  ok: boolean;
  uploadedName?: string;
  mediaId?: string;
  reason?: string;
}> {
  const purpose = options?.purpose ?? "upload";
  const preferDirect = options?.preferDirect ?? true;
  const { file: safeFile, fileName: safeName } = withSafeUploadFile(file);
  const label = sanitizeUploadFileName(displayName || safeName);

  if (preferDirect) {
    const direct = await uploadViaDirectStorage(safeFile, label, purpose);
    if (direct.ok) return direct;

    if (safeFile.size > VERCEL_SAFE_REQUEST_BYTES) {
      return {
        ok: false,
        reason:
          direct.reason ??
          `${label}: file is too large for fallback upload. Compress to under ${formatFileSize(VERCEL_SAFE_REQUEST_BYTES)} and retry.`,
      };
    }
  }

  const result = await postMediaOnce(safeFile);

  if (result.isRequestTooLarge) {
    return {
      ok: false,
      reason: `${label}: file is too large for upload. Compress to under ${formatFileSize(VERCEL_SAFE_REQUEST_BYTES)} and retry.`,
    };
  }

  if (result.uploaded.length > 0) {
    return { ok: true, uploadedName: result.uploaded[0] };
  }

  const fileError = result.errors.find(
    (entry) =>
      entry.startsWith(`${safeFile.name}:`) ||
      entry.startsWith(`${label}:`) ||
      entry.startsWith(`${file.name}:`),
  );
  return {
    ok: false,
    reason:
      fileError ??
      result.errors[0] ??
      result.message ??
      `${label}: upload failed.`,
  };
}

export async function uploadMediaFilesQueue(
  files: File[],
  callbacks?: {
    onProgress?: (update: UploadProgressUpdate) => void;
    /** Called after each file finishes; use source file to clear preview tiles. */
    onFileUploaded?: (sourceFile: File, ok: boolean) => void;
    skipPrepare?: boolean;
    preparedItems?: PreparedUploadItem[];
    preferDirectUpload?: boolean;
  },
): Promise<MediaUploadResult> {
  const total = files.length;
  const preferDirect = callbacks?.preferDirectUpload ?? true;
  if (total === 0) {
    return {
      uploadedCount: 0,
      uploadedNames: [],
      failures: [],
      validationErrors: [],
    };
  }

  callbacks?.onProgress?.(
    buildProgress("validating", 0, total, `Checking ${total} image(s)...`),
  );

  let prepared: PreparedUploadItem[];
  let validationErrors: FileValidationError[];

  if (callbacks?.skipPrepare && callbacks.preparedItems) {
    prepared = callbacks.preparedItems.map((item) => {
      const { file, fileName } = withSafeUploadFile(item.file);
      return {
        sourceName: fileName,
        file,
        sourceFile: item.sourceFile ?? item.file,
      };
    });
    validationErrors = [];
  } else {
    callbacks?.onProgress?.(
      buildProgress(
        "preparing",
        0,
        total,
        preferDirect
          ? `Checking images 0/${total}`
          : `Preparing images 0/${total}`,
      ),
    );

    const prep = preferDirect
      ? await prepareImageFilesForDirect(files, (current, prepTotal, name) => {
          callbacks?.onProgress?.(
            buildProgress(
              "preparing",
              current,
              prepTotal,
              `Checking ${name} (${current}/${prepTotal})`,
            ),
          );
        })
      : await prepareImageFiles(files, (current, prepTotal, name) => {
          callbacks?.onProgress?.(
            buildProgress(
              "preparing",
              current,
              prepTotal,
              `Preparing ${name} (${current}/${prepTotal})`,
            ),
          );
        });
    prepared = prep.prepared;
    validationErrors = prep.rejected;
  }

  const uploadedNames: string[] = [];
  const failures: UploadFileFailure[] = [];
  const uploadTotal = prepared.length;

  for (let index = 0; index < prepared.length; index += 1) {
    const item = prepared[index];
    callbacks?.onProgress?.(
      buildProgress(
        "uploading",
        index + 1,
        uploadTotal,
        preferDirect
          ? `Uploading ${index + 1}/${uploadTotal}: ${item.sourceName}`
          : `Uploading ${index + 1}/${uploadTotal}: ${item.sourceName}`,
      ),
    );

    // eslint-disable-next-line no-await-in-loop
    const result = await uploadSingleMediaFile(item.file, item.sourceName, {
      purpose: "upload",
      preferDirect,
    });
    callbacks?.onFileUploaded?.(item.sourceFile, result.ok);
    if (result.ok && result.uploadedName) {
      uploadedNames.push(result.uploadedName);
    } else {
      failures.push({
        fileName: item.sourceName,
        reason: result.reason ?? `${item.sourceName}: upload failed.`,
        file: item.sourceFile,
      });
    }

    if (index < prepared.length - 1) {
      // eslint-disable-next-line no-await-in-loop
      await delay(BETWEEN_UPLOAD_DELAY_MS);
    }
  }

  callbacks?.onProgress?.(
    buildProgress(
      "complete",
      uploadTotal,
      uploadTotal,
      `Finished: ${uploadedNames.length}/${uploadTotal} uploaded`,
    ),
  );

  return {
    uploadedCount: uploadedNames.length,
    uploadedNames,
    failures,
    validationErrors,
  };
}

export async function submitBulkDraftRequest(params: {
  files: File[];
  mediaIds: string[];
  shared: Record<string, unknown>;
}): Promise<BulkDraftRequestResult> {
  const formData = new FormData();
  params.files.forEach((file) => formData.append("files", file));
  formData.append("mediaIds", JSON.stringify(params.mediaIds));
  formData.append("shared", JSON.stringify(params.shared));

  let res: Response | null = null;
  let attempts = 0;

  while (attempts < MAX_UPLOAD_RETRIES) {
    try {
      // eslint-disable-next-line no-await-in-loop
      res = await fetchWithTimeout("/api/admin/products/bulk-draft", {
        method: "POST",
        body: formData,
        timeoutMs: UPLOAD_REQUEST_TIMEOUT_MS,
      });
      if (res.status < 500) break;
    } catch {
      // retry
    }
    attempts += 1;
    if (attempts < MAX_UPLOAD_RETRIES) {
      // eslint-disable-next-line no-await-in-loop
      await delay(UPLOAD_RETRY_DELAY_MS * attempts);
    }
  }

  if (!res) {
    return {
      payload: {
        message: "Bulk request failed after retries.",
        created: [],
        errors: ["Bulk request failed after retries."],
      },
      status: 503,
      isRequestTooLarge: false,
    };
  }

  const raw = await res.text();
  let payload: BulkDraftPayload;
  try {
    payload = JSON.parse(raw) as BulkDraftPayload;
  } catch {
    const isRequestTooLarge =
      res.status === 413 || /request entity too large/i.test(raw);
    const fallbackMessage = isRequestTooLarge
      ? "Upload too large. Retrying with smaller batches..."
      : raw.trim() || "Bulk create failed";
    payload = {
      message: fallbackMessage,
      created: [],
      errors: [fallbackMessage],
    };
  }

  const isRequestTooLarge =
    res.status === 413 ||
    /request entity too large/i.test(payload.message ?? "") ||
    /request entity too large/i.test(raw);

  return { payload, status: res.status, isRequestTooLarge };
}

export async function runBulkDraftUpload(params: {
  files: File[];
  selectedMediaIds: string[];
  shared: Record<string, unknown>;
  onProgress?: (update: UploadProgressUpdate) => void;
}): Promise<BulkDraftUploadResult> {
  const steps: Array<{ type: "media" | "file"; file?: File; label: string }> =
    [];

  if (params.selectedMediaIds.length > 0) {
    steps.push({
      type: "media",
      label: `${params.selectedMediaIds.length} library image(s)`,
    });
  }

  params.files.forEach((file) => {
    steps.push({ type: "file", file, label: file.name });
  });

  const totalSteps = steps.length;
  const created: BulkDraftPayload["created"] = [];
  const errors: string[] = [];
  const failures: UploadFileFailure[] = [];

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    params.onProgress?.(
      buildProgress(
        "uploading",
        index + 1,
        totalSteps,
        step.type === "media"
          ? `Creating from library (${index + 1}/${totalSteps})`
          : `Creating product ${index + 1}/${totalSteps}: ${step.label}`,
      ),
    );

    if (step.type === "media") {
      // eslint-disable-next-line no-await-in-loop
      const result = await submitBulkDraftRequest({
        files: [],
        mediaIds: params.selectedMediaIds,
        shared: params.shared,
      });

      if (result.payload.created?.length) {
        created.push(...result.payload.created);
      }
      if (result.payload.errors?.length) {
        errors.push(...result.payload.errors);
      }
      if (result.status >= 400 && (result.payload.created?.length ?? 0) === 0) {
        errors.push(result.payload.message ?? "Library bulk create failed.");
      }
      continue;
    }

    if (!step.file) continue;

    // eslint-disable-next-line no-await-in-loop
    const directUpload = await uploadViaDirectStorage(
      step.file,
      step.label,
      "product-draft",
    );

    if (!directUpload.ok || !directUpload.mediaId) {
      if (step.file.size <= VERCEL_SAFE_REQUEST_BYTES) {
        // eslint-disable-next-line no-await-in-loop
        const fallback = await submitBulkDraftRequest({
          files: [step.file],
          mediaIds: [],
          shared: params.shared,
        });

        if (fallback.isRequestTooLarge) {
          const reason = `${step.label}: file too large to upload. Compress and retry.`;
          errors.push(reason);
          failures.push({ fileName: step.label, reason, file: step.file });
          continue;
        }

        if (fallback.payload.created?.length) {
          created.push(...fallback.payload.created);
        }
        if (fallback.payload.errors?.length) {
          errors.push(...fallback.payload.errors);
        }
        if (
          fallback.status >= 400 &&
          (fallback.payload.created?.length ?? 0) === 0
        ) {
          const reason =
            fallback.payload.message ??
            fallback.payload.errors?.[0] ??
            `${step.label}: could not create product.`;
          errors.push(reason);
          failures.push({ fileName: step.label, reason, file: step.file });
        }
      } else {
        const reason =
          directUpload.reason ??
          `${step.label}: direct upload failed. Compress and retry.`;
        errors.push(reason);
        failures.push({ fileName: step.label, reason, file: step.file });
      }

      if (index < steps.length - 1) {
        // eslint-disable-next-line no-await-in-loop
        await delay(BETWEEN_UPLOAD_DELAY_MS);
      }
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const result = await submitBulkDraftRequest({
      files: [],
      mediaIds: [directUpload.mediaId],
      shared: params.shared,
    });

    if (result.payload.created?.length) {
      created.push(...result.payload.created);
    }
    if (result.payload.errors?.length) {
      errors.push(...result.payload.errors);
    }
    if (result.status >= 400 && (result.payload.created?.length ?? 0) === 0) {
      const reason =
        result.payload.message ??
        result.payload.errors?.[0] ??
        `${step.label}: could not create product.`;
      errors.push(reason);
      failures.push({ fileName: step.label, reason, file: step.file });
    }

    if (index < steps.length - 1) {
      // eslint-disable-next-line no-await-in-loop
      await delay(BETWEEN_UPLOAD_DELAY_MS);
    }
  }

  params.onProgress?.(
    buildProgress(
      "complete",
      totalSteps,
      totalSteps,
      `Finished: ${created.length} product(s) created`,
    ),
  );

  return { created, errors, failures };
}

export function mergeUniqueFiles(prev: File[], next: File[]): File[] {
  const map = new Map<string, File>();
  [...prev, ...next].forEach((file) => {
    map.set(uploadFileIdentityKey(file), file);
  });
  return Array.from(map.values());
}
