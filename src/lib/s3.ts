import { requireAdminActionUser } from "@/lib/auth/require-admin";
import { env } from "@/env.mjs";
import { AwsClient } from "aws4fetch";

/**
 * Hub media storage on Cloudflare R2.
 *
 * - Browser direct uploads: aws4fetch presigned PUT (S3 API)
 * - Worker put/get/delete: R2 binding (no S3 signature — avoids 401s from
 *   aws4fetch + global_fetch_strictly_public on Workers)
 *
 * SSR Tex uses Supabase Storage instead; Hub cannot copy that path 1:1.
 */

type R2BucketLike = {
  put: (
    key: string,
    value: ArrayBuffer | ArrayBufferView | string | null,
    options?: {
      httpMetadata?: { contentType?: string; cacheControl?: string };
    },
  ) => Promise<unknown>;
  get: (key: string) => Promise<{
    size: number;
    arrayBuffer: () => Promise<ArrayBuffer>;
  } | null>;
  delete: (keys: string | string[]) => Promise<void>;
};

async function getCloudflareEnv(): Promise<Record<string, unknown> | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env: cfEnv } = await getCloudflareContext({ async: true });
    return (cfEnv as Record<string, unknown> | undefined) ?? null;
  } catch {
    return null;
  }
}

function missingMediaBucketError() {
  return new Error(
    "Media storage is not bound (MEDIA_BUCKET missing). Enable R2 on this Cloudflare account, create bucket hubofcraftss-cdn, add the R2 binding, and redeploy.",
  );
}

function getAwsClient() {
  return new AwsClient({
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });
}

function objectUrl(key: string) {
  const endpoint = env.S3_ENDPOINT.replace(/\/$/, "");
  const bucket = env.NEXT_PUBLIC_S3_BUCKET;
  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${endpoint}/${bucket}/${encodedKey}`;
}

function toArrayBuffer(body: Buffer | Uint8Array | string | ArrayBuffer) {
  if (typeof body === "string") {
    return new TextEncoder().encode(body);
  }
  if (body instanceof ArrayBuffer) return body;
  if (Buffer.isBuffer(body)) {
    return body.buffer.slice(
      body.byteOffset,
      body.byteOffset + body.byteLength,
    );
  }
  return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
}

export type PutObjectParams = {
  Bucket: string;
  Key: string;
  Body: Buffer | Uint8Array | string | ArrayBuffer;
  ContentType?: string;
  CacheControl?: string;
};

/** Browser staging upload — S3 presigned PUT (no Content-Type in signature). */
export async function createPresignedPutUrl(params: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  await requireAdminActionUser();
  const expires = params.expiresInSeconds ?? 60 * 10;
  const url = `${objectUrl(params.key)}?X-Amz-Expires=${expires}`;

  const signed = await getAwsClient().sign(url, {
    method: "PUT",
    aws: { signQuery: true },
  });

  return String(signed.url);
}

export async function putObject(params: PutObjectParams) {
  await requireAdminActionUser();

  const cfEnv = await getCloudflareEnv();
  const r2 = (cfEnv?.MEDIA_BUCKET as R2BucketLike | undefined) ?? null;
  if (r2) {
    await r2.put(params.Key, toArrayBuffer(params.Body), {
      httpMetadata: {
        contentType: params.ContentType,
        cacheControl: params.CacheControl,
      },
    });
    return { etag: null as string | null };
  }

  // Running on Cloudflare without MEDIA_BUCKET — S3 fallback returns 401 on Workers.
  if (cfEnv) {
    throw missingMediaBucketError();
  }

  // Local `next dev` fallback when no R2 binding is present.
  const headers: Record<string, string> = {};
  if (params.ContentType) headers["Content-Type"] = params.ContentType;
  if (params.CacheControl) headers["Cache-Control"] = params.CacheControl;

  const body = toArrayBuffer(params.Body);
  const res = await getAwsClient().fetch(objectUrl(params.Key), {
    method: "PUT",
    headers,
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `R2 put failed (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
    );
  }

  return { etag: res.headers.get("etag") };
}

export async function getObjectBuffer(params: {
  key: string;
  maxBytes?: number;
}) {
  await requireAdminActionUser();

  const cfEnv = await getCloudflareEnv();
  const r2 = (cfEnv?.MEDIA_BUCKET as R2BucketLike | undefined) ?? null;
  if (r2) {
    const obj = await r2.get(params.key);
    if (!obj) {
      throw new Error("Uploaded file not found. Try uploading again.");
    }
    if (params.maxBytes && obj.size > params.maxBytes) {
      throw new Error("Image is too large after upload. Compress and retry.");
    }
    const bytes = new Uint8Array(await obj.arrayBuffer());
    if (params.maxBytes && bytes.byteLength > params.maxBytes) {
      throw new Error("Image is too large after upload. Compress and retry.");
    }
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  if (cfEnv) {
    throw missingMediaBucketError();
  }

  const res = await getAwsClient().fetch(objectUrl(params.key), {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`R2 get failed (${res.status}).`);
  }

  const declared = Number(res.headers.get("content-length") || 0);
  if (
    params.maxBytes &&
    Number.isFinite(declared) &&
    declared > 0 &&
    declared > params.maxBytes
  ) {
    try {
      await res.body?.cancel();
    } catch {
      /* ignore */
    }
    throw new Error("Image is too large after upload. Compress and retry.");
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  if (params.maxBytes && bytes.byteLength > params.maxBytes) {
    throw new Error("Image is too large after upload. Compress and retry.");
  }
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

export async function deleteObjects(params: { keys: string[] }) {
  await requireAdminActionUser();
  const keys = [...new Set(params.keys.map((k) => k.trim()).filter(Boolean))];
  if (keys.length === 0) return;

  const cfEnv = await getCloudflareEnv();
  const r2 = (cfEnv?.MEDIA_BUCKET as R2BucketLike | undefined) ?? null;
  if (r2) {
    await r2.delete(keys);
    return;
  }

  if (cfEnv) {
    throw missingMediaBucketError();
  }

  const client = getAwsClient();
  await Promise.all(
    keys.map(async (key) => {
      const res = await client.fetch(objectUrl(key), { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `R2 delete failed (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
        );
      }
    }),
  );
}

export const uploadImage = async (params: PutObjectParams) => {
  return putObject(params);
};
