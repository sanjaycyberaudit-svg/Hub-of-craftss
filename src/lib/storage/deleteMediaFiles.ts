import { logServerError } from "@/lib/api/public-error";
import { env } from "@/env.mjs";
import { deleteObjects } from "@/lib/s3";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { SUPABASE_MEDIA_BUCKET } from "@/lib/utils";

/** Best-effort delete of storage objects (never throws). */
export async function deleteMediaStorageKeys(keys: string[]) {
  const uniqueKeys = [
    ...new Set(keys.map((key) => key.trim()).filter(Boolean)),
  ];
  if (uniqueKeys.length === 0) return;

  const supabaseKeys: string[] = [];
  const r2Keys: string[] = [];

  const supabaseUrlPrefix = `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${SUPABASE_MEDIA_BUCKET}/`;
  const cdnBase = env.NEXT_PUBLIC_CDN_URL?.replace(/\/$/, "") || "";

  for (const raw of uniqueKeys) {
    if (!raw) continue;

    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      if (raw.startsWith(supabaseUrlPrefix)) {
        const extracted = raw.slice(supabaseUrlPrefix.length);
        if (extracted) supabaseKeys.push(extracted);
        continue;
      }

      if (cdnBase && raw.startsWith(`${cdnBase}/`)) {
        const extracted = raw.slice(`${cdnBase}/`.length);
        if (extracted) r2Keys.push(extracted);
        continue;
      }

      // Unknown URL shape: best-effort no-op.
      continue;
    }

    if (raw.startsWith("sakthi/")) {
      supabaseKeys.push(raw);
      continue;
    }

    r2Keys.push(raw);
  }

  if (r2Keys.length > 0) {
    try {
      await deleteObjects({ keys: r2Keys });
    } catch (error) {
      logServerError("deleteMediaStorageKeys/r2", error);
    }
  }

  if (supabaseKeys.length > 0) {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.storage
      .from(SUPABASE_MEDIA_BUCKET)
      .remove(supabaseKeys);

    if (error) {
      logServerError("deleteMediaStorageKeys/supabase", error);
    }
  }
}
