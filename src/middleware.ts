import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  classifyAuthCookieState,
  clearSupabaseAuthCookiesOnResponse,
} from "@/lib/auth/middleware-session-cookie";
import { getCanonicalSiteOrigin } from "@/lib/auth/site-urls";
import {
  checkAuthRateLimit,
  getRequestIp,
  isAuthRateLimitPath,
} from "@/lib/auth/rate-limit";

const AUTH_GET_USER_TIMEOUT_MS = 5000;

function redirectToAdminSignIn(
  request: NextRequest,
  pathname: string,
  error = "Please sign in to access admin.",
) {
  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("from", pathname);
  signIn.searchParams.set("error", error);
  return NextResponse.redirect(signIn);
}

async function getUserWithTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("Auth check timed out")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/** Supabase sometimes returns OAuth to Site URL root (?code=) — forward to /auth/callback. */
function redirectStrayOAuthToCallback(
  request: NextRequest,
): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname.startsWith("/auth/callback")) {
    return null;
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (!code && !(tokenHash && type)) {
    return null;
  }

  const callback = new URL("/auth/callback", request.url);
  searchParams.forEach((value, key) => {
    callback.searchParams.set(key, value);
  });

  return NextResponse.redirect(callback);
}

/** Keep storefront on the canonical custom domain (www) for Cashfree whitelisting. */
function redirectToCanonicalHost(request: NextRequest): NextResponse | null {
  const hostHeader = request.headers.get("host") ?? "";
  const host = hostHeader.split(":")[0]?.toLowerCase() ?? "";
  if (
    !host ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".vercel.app") ||
    host.endsWith(".workers.dev") ||
    host.endsWith(".pages.dev")
  ) {
    return null;
  }

  let canonical: URL;
  try {
    canonical = new URL(getCanonicalSiteOrigin());
  } catch {
    return null;
  }

  const canonicalHost = canonical.host.toLowerCase();
  const apexHost = canonicalHost.replace(/^www\./, "");
  const wwwHost = apexHost.startsWith("www.") ? apexHost : `www.${apexHost}`;
  // Allow both apex and www of the configured domain (no forced hop).
  if (host === canonicalHost || host === apexHost || host === wwwHost) {
    return null;
  }

  const redirect = new URL(request.url);
  redirect.protocol = canonical.protocol;
  redirect.host = canonicalHost;
  // 307 (not 308): browsers aggressively cache permanent redirects; a wrong
  // canonical SITE_URL must not lock users onto workers.dev forever.
  return NextResponse.redirect(redirect, 307);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const canonicalRedirect = redirectToCanonicalHost(request);
  if (canonicalRedirect) {
    return canonicalRedirect;
  }

  if (isAuthRateLimitPath(pathname)) {
    const ip = getRequestIp(request.headers);
    const { limited } = await checkAuthRateLimit(ip);
    if (limited) {
      const signIn = new URL("/sign-in", request.url);
      signIn.searchParams.set(
        "error",
        "Too many sign-in attempts. Please wait a minute and try again.",
      );
      return NextResponse.redirect(signIn);
    }
  }

  const strayOAuth = redirectStrayOAuthToCallback(request);
  if (strayOAuth) {
    return strayOAuth;
  }

  const isAdminPath = pathname.startsWith("/admin");
  const authCookieState = classifyAuthCookieState(request);

  // Public storefront pages: skip Supabase getUser even if cookies exist.
  // Auth refresh still runs on admin / account / orders routes.
  const needsSessionRefresh =
    isAdminPath ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/setting") ||
    pathname.startsWith("/wish-list") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/auth/");

  if (authCookieState === "absent") {
    if (isAdminPath) {
      return redirectToAdminSignIn(request, pathname);
    }

    return NextResponse.next({
      request: { headers: request.headers },
    });
  }

  if (authCookieState === "invalid") {
    const response = NextResponse.next({
      request: { headers: request.headers },
    });
    clearSupabaseAuthCookiesOnResponse(request, response);

    if (isAdminPath) {
      return redirectToAdminSignIn(request, pathname);
    }

    return response;
  }

  if (!needsSessionRefresh) {
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  let user: { id: string } | null = null;

  try {
    ({
      data: { user },
    } = await getUserWithTimeout(
      supabase.auth.getUser(),
      AUTH_GET_USER_TIMEOUT_MS,
    ));
  } catch {
    if (isAdminPath) {
      return redirectToAdminSignIn(
        request,
        pathname,
        "Session check timed out. Please sign in again.",
      );
    }

    // Storefront: don't block shoppers if auth is slow — page-level auth handles /orders.
    return response;
  }

  if (isAdminPath && !user) {
    clearSupabaseAuthCookiesOnResponse(request, response);
    return redirectToAdminSignIn(request, pathname);
  }

  if (!isAdminPath && !user) {
    clearSupabaseAuthCookiesOnResponse(request, response);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
