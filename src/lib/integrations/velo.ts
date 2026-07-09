import { createHash, randomBytes } from "crypto";
import db from "@/lib/supabase/db";
import { externalApiKeys } from "@/lib/supabase/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

const VELO_PROVIDER = "velo";

export type CreatedVeloApiKey = {
  id: string;
  clientName: string;
  keyPrefix: string;
  apiKey: string;
};

function hashApiKey(apiKey: string) {
  return createHash("sha256").update(apiKey).digest("hex");
}

function generateApiKeyValue() {
  const publicSegment = randomBytes(4).toString("hex");
  const secretSegment = randomBytes(24).toString("base64url");
  return `velo_live_${publicSegment}_${secretSegment}`;
}

export async function createVeloApiKey(
  clientName: string,
  createdBy?: string | null,
): Promise<CreatedVeloApiKey> {
  const apiKey = generateApiKeyValue();
  const keyPrefix = apiKey.slice(0, 18);
  const keyHash = hashApiKey(apiKey);

  const [inserted] = await db
    .insert(externalApiKeys)
    .values({
      provider: VELO_PROVIDER,
      clientName,
      keyPrefix,
      keyHash,
      createdBy: createdBy ?? null,
    })
    .returning({
      id: externalApiKeys.id,
      clientName: externalApiKeys.clientName,
      keyPrefix: externalApiKeys.keyPrefix,
    });

  return {
    ...inserted,
    apiKey,
  };
}

export async function listVeloApiKeys() {
  return db
    .select({
      id: externalApiKeys.id,
      clientName: externalApiKeys.clientName,
      keyPrefix: externalApiKeys.keyPrefix,
      isActive: externalApiKeys.isActive,
      createdAt: externalApiKeys.createdAt,
      lastUsedAt: externalApiKeys.lastUsedAt,
      revokedAt: externalApiKeys.revokedAt,
    })
    .from(externalApiKeys)
    .where(eq(externalApiKeys.provider, VELO_PROVIDER))
    .orderBy(desc(externalApiKeys.createdAt));
}

export async function revokeVeloApiKey(id: string) {
  await db
    .update(externalApiKeys)
    .set({
      isActive: false,
      revokedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(externalApiKeys.id, id),
        eq(externalApiKeys.provider, VELO_PROVIDER),
        isNull(externalApiKeys.revokedAt),
      ),
    );
}

export async function resolveVeloApiKey(apiKey: string) {
  if (!apiKey) return null;
  const keyHash = hashApiKey(apiKey.trim());
  const [record] = await db
    .select({
      id: externalApiKeys.id,
      clientName: externalApiKeys.clientName,
      isActive: externalApiKeys.isActive,
      revokedAt: externalApiKeys.revokedAt,
    })
    .from(externalApiKeys)
    .where(
      and(
        eq(externalApiKeys.provider, VELO_PROVIDER),
        eq(externalApiKeys.keyHash, keyHash),
      ),
    )
    .limit(1);

  if (!record || !record.isActive || record.revokedAt) return null;
  return record;
}

export async function touchVeloApiKeyUsage(id: string) {
  await db
    .update(externalApiKeys)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(externalApiKeys.id, id));
}
