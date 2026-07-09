"use server";
import { requireAdminActionUser } from "@/lib/auth/require-admin";
import { env } from "@/env.mjs";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: env.NEXT_PUBLIC_S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

export const bufferToFile = (buffer: Buffer) =>
  `data:image/webp;base64,${buffer.toString("base64")}`;

export async function createPresignedPutUrl(params: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  await requireAdminActionUser();
  const command = new PutObjectCommand({
    Bucket: env.NEXT_PUBLIC_S3_BUCKET,
    Key: params.key,
    ContentType: params.contentType,
  });

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: params.expiresInSeconds ?? 60 * 10,
  });

  return signedUrl;
}

export async function putObject(params: PutObjectCommandInput) {
  await requireAdminActionUser();
  return s3Client.send(new PutObjectCommand(params));
}

export async function getObjectBuffer(params: { key: string }) {
  await requireAdminActionUser();
  const res = await s3Client.send(
    new GetObjectCommand({
      Bucket: env.NEXT_PUBLIC_S3_BUCKET,
      Key: params.key,
    }),
  );

  const body = res.Body;
  if (!body) return Buffer.alloc(0);
  return Buffer.from(await body.transformToByteArray());
}

export async function deleteObjects(params: { keys: string[] }) {
  await requireAdminActionUser();
  const keys = [...new Set(params.keys.map((k) => k.trim()).filter(Boolean))];
  if (keys.length === 0) return;

  await s3Client.send(
    new DeleteObjectsCommand({
      Bucket: env.NEXT_PUBLIC_S3_BUCKET,
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    }),
  );
}

export const uploadImage = async (params: PutObjectCommandInput) => {
  await requireAdminActionUser();
  const putObject = new PutObjectCommand(params);
  const s3Response = await s3Client.send(putObject);
  return s3Response;
};
