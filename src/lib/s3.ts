import { requireAdminActionUser } from "@/lib/auth/require-admin";
import { env } from "@/env.mjs";
import { AwsClient } from "aws4fetch";

/** Lightweight R2/S3 client — avoids bundling @aws-sdk on Workers Free. */
function getAwsClient() {
  return new AwsClient({
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    service: "s3",
    // Cloudflare R2 S3 API uses "auto" as the signing region.
    region: env.NEXT_PUBLIC_S3_REGION || "auto",
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
  Body: Buffer | Uint8Array | string;
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
  const url = new URL(objectUrl(params.key));
  url.searchParams.set("X-Amz-Expires", String(expires));

  const signed = await getAwsClient().sign(
    new Request(url.toString(), {
      method: "PUT",
      headers: {
        "Content-Type": params.contentType || "application/octet-stream",
      },
    }),
    { aws: { signQuery: true } },
  );

  return signed.url;
}

export async function putObject(params: PutObjectParams) {
  await requireAdminActionUser();
  const headers: Record<string, string> = {};
  if (params.ContentType) headers["Content-Type"] = params.ContentType;
  if (params.CacheControl) headers["Cache-Control"] = params.CacheControl;

  const body =
    typeof params.Body === "string"
      ? params.Body
      : params.Body instanceof Uint8Array
        ? params.Body
        : new Uint8Array(params.Body);

  const signed = await getAwsClient().sign(objectUrl(params.Key), {
    method: "PUT",
    headers,
    body,
  });

  const res = await fetch(signed);
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
  const signed = await getAwsClient().sign(objectUrl(params.key), {
    method: "GET",
  });
  const res = await fetch(signed);
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
    // Cancel body without buffering oversized objects into Worker memory.
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
  // Individual deletes keep the Worker free of AWS SDK XML marshalling.
  await Promise.all(
    keys.map(async (key) => {
      const signed = await client.sign(objectUrl(key), { method: "DELETE" });
      const res = await fetch(signed);
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
