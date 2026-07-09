/** Default landing page after admin sign-in when no `from` is set. */
export const ADMIN_POST_LOGIN_PATH = "/admin/dashboard";

const REDIRECT_PARAM_KEYS = ["from", "next", "redirect"] as const;

/** Reject open redirects; only allow same-origin relative paths. */
export function isSafeRedirectPath(
  path: string | null | undefined,
): path is string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return false;
  }
  return !path.includes("\\");
}

export function getRedirectFromSearchParams(
  params: URLSearchParams | { get: (key: string) => string | null },
  fallback = "/",
): string {
  for (const key of REDIRECT_PARAM_KEYS) {
    const value = params.get(key);
    if (isSafeRedirectPath(value)) {
      return value;
    }
  }
  return fallback;
}

export function appendFromToSignIn(
  signInPath: string,
  fromPath: string,
  extraParams?: Record<string, string>,
): string {
  const url = new URL(signInPath, "http://local");
  if (isSafeRedirectPath(fromPath)) {
    url.searchParams.set("from", fromPath);
  }
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      url.searchParams.set(key, value);
    }
  }
  return `${url.pathname}${url.search}`;
}
