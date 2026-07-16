/** Hosts that should never be redirected (local dev / preview). */
export function isLocalOrPreviewHost(host: string): boolean {
  return (
    !host ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".vercel.app")
  );
}

/** Cloudflare default URLs — redirect to the shop custom domain in production. */
export function isPlatformDefaultHost(host: string): boolean {
  return host.endsWith(".workers.dev") || host.endsWith(".pages.dev");
}

export function isCanonicalShopHost(
  host: string,
  canonicalHost: string,
): boolean {
  const apexHost = canonicalHost.replace(/^www\./, "");
  const wwwHost = apexHost.startsWith("www.") ? apexHost : `www.${apexHost}`;
  return host === canonicalHost || host === apexHost || host === wwwHost;
}

export function isCustomCanonicalHost(canonicalHost: string): boolean {
  return (
    Boolean(canonicalHost) &&
    !isPlatformDefaultHost(canonicalHost) &&
    !isLocalOrPreviewHost(canonicalHost)
  );
}

/**
 * When the request is on workers.dev / pages.dev (or another non-canonical host),
 * return the canonical shop URL (path + query preserved). Otherwise null.
 */
export function buildCanonicalRedirectUrl(
  requestUrl: string,
  host: string,
  canonicalOrigin: string,
): string | null {
  const normalizedHost = host.split(":")[0]?.toLowerCase() ?? "";
  if (isLocalOrPreviewHost(normalizedHost)) {
    return null;
  }

  let canonical: URL;
  try {
    canonical = new URL(canonicalOrigin);
  } catch {
    return null;
  }

  const canonicalHost = canonical.host.toLowerCase();
  if (!isCustomCanonicalHost(canonicalHost)) {
    return null;
  }

  if (isCanonicalShopHost(normalizedHost, canonicalHost)) {
    return null;
  }

  const redirect = new URL(requestUrl);
  redirect.protocol = canonical.protocol;
  redirect.host = canonicalHost;
  return redirect.toString();
}
