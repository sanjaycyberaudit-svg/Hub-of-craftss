import type { NextRequest } from "next/server";

/** Build a same-origin redirect target after auth completes. */
export function getPostAuthRedirectUrl(
  request: NextRequest,
  nextPath: string,
): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const { origin } = request.nextUrl;

  if (process.env.NODE_ENV === "development") {
    return `${origin}${nextPath}`;
  }

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}${nextPath}`;
  }

  return `${origin}${nextPath}`;
}

export function buildOAuthCallbackUrl(
  origin: string,
  nextPath: string,
): string {
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", nextPath);
  return callbackUrl.toString();
}
