import { dangerouslyDeleteByTag } from "@vercel/functions";

const VERCEL_TAGS_PER_PURGE = 50;
/** Cloudflare allows 100 tags per purge call; Free plan: 5 calls/min per account. */
const CLOUDFLARE_TAGS_PER_PURGE = 100;
const CLOUDFLARE_TIMEOUT_MS = 5_000;

type FetchFn = typeof fetch;

/** Next's patched fetch would mark a rendering route dynamic; purges are side effects. */
function unpatchedFetch(): FetchFn {
  return (
    (globalThis as { _nextOriginalFetch?: FetchFn })._nextOriginalFetch ?? fetch
  );
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function purgeVercelTags(tags: readonly string[]) {
  for (const batch of chunk(tags, VERCEL_TAGS_PER_PURGE)) {
    try {
      await dangerouslyDeleteByTag(batch);
    } catch (error) {
      console.warn("[cache] vercel edge purge failed:", error);
    }
  }
}

function cloudflarePurgeConfig() {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  const token = process.env.CLOUDFLARE_CACHE_PURGE_TOKEN?.trim();
  return zoneId && token ? { zoneId, token } : null;
}

async function requestCloudflarePurge(
  zoneId: string,
  token: string,
  tags: string[],
): Promise<{ ok: boolean; retryable: boolean; detail: string }> {
  try {
    const res = await unpatchedFetch()(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(CLOUDFLARE_TIMEOUT_MS),
      },
    );
    if (res.ok) return { ok: true, retryable: false, detail: "" };
    const body = await res.text().catch(() => "");
    return {
      ok: false,
      retryable: res.status >= 500,
      detail: `HTTP ${res.status} ${body.slice(0, 200)}`,
    };
  } catch (error) {
    return { ok: false, retryable: true, detail: String(error) };
  }
}

async function purgeCloudflareTags(tags: readonly string[]) {
  const config = cloudflarePurgeConfig();
  if (!config) return;
  for (const batch of chunk(tags, CLOUDFLARE_TAGS_PER_PURGE)) {
    let result = await requestCloudflarePurge(
      config.zoneId,
      config.token,
      batch,
    );
    if (!result.ok && result.retryable) {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      result = await requestCloudflarePurge(config.zoneId, config.token, batch);
    }
    if (!result.ok) {
      // Cached copies then expire via CLOUDFLARE_API_CACHE_SECONDS.
      console.warn(`[cache] cloudflare purge failed: ${result.detail}`);
    }
  }
}

/**
 * Deletes edge-cached responses carrying any of `tags` so the next request is a
 * fresh MISS. Vercel goes first: a Cloudflare MISS refetches through Vercel's
 * edge, which must not still hold the old copy. Never throws.
 */
export async function purgeEdgeCacheTags(
  tags: readonly string[],
): Promise<void> {
  const unique = [...new Set(tags.filter(Boolean))];
  if (unique.length === 0) return;
  await purgeVercelTags(unique);
  await purgeCloudflareTags(unique);
}
