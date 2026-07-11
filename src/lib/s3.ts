import { requireAdminActionUser } from "@/lib/auth/require-admin";
import { env } from "@/env.mjs";
import { AwsClient } from "aws4fetch";

/**
 * Lightweight R2 S3 client (aws4fetch) — keeps Workers Free under 3 MiB.
 * @see https://developers.cloudflare.com/r2/examples/aws/aws4fetch/
 */
function getAwsClient() {
  return new AwsClient({
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    service: "s3",
    // R2 requires region "auto" (do not use bucket location strings).
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

export type PutObjectParams = {
  Bucket: string;
  Key: string;
  Body: Buffer | Uint8Array | string | ArrayBuffer;
  ContentType?: string;
  CacheControl?: string;
};

export async function createPresignedPutUrl(params: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  await requireAdminActionUser();
  const expires = params.expiresInSeconds ?? 60 * 10;
  // Intentionally omit Content-Type from the signature. Signing it causes
  // browser PUTs to 403 (header normalization / charset mismatches).
  // @see https://ishan.page/blog/cloudflare-r2-workers-presigned/
  const url = `${objectUrl(params.key)}?X-Amz-Expires=${expires}`;

  const signed = await getAwsClient().sign(url, {
    method: "PUT",
    aws: { signQuery: true },
  });

  return String(signed.url);
}

export async function putObject(params: PutObjectParams) {
  await requireAdminActionUser();
  const headers: Record<string, string> = {};
  if (params.ContentType) headers["Content-Type"] = params.ContentType;
  if (params.CacheControl) headers["Cache-Control"] = params.CacheControl;

  const res = await getAwsClient().fetch(objectUrl(params.Key), {
    method: "PUT",
    headers,
    body: params.Body as BodyInit,
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
  /** Abort if Content-Length or downloaded body exceeds this (Worker memory). */
  maxBytes?: number;
}) {
  await requireAdminActionUser();
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
