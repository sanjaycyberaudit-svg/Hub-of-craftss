import type { NextRequest } from "next/server";
import { classifyAuthCookieState } from "./middleware-session-cookie";

function makeRequest(cookies: Record<string, string>): NextRequest {
  return {
    cookies: {
      getAll: () =>
        Object.entries(cookies).map(([name, value]) => ({ name, value })),
      get: (name: string) => {
        const value = cookies[name];
        return value ? { name, value } : undefined;
      },
    },
  } as unknown as NextRequest;
}

function encodeSession(session: Record<string, unknown>) {
  return JSON.stringify(session);
}

function makeJwt(payload: Record<string, unknown>) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `${header}.${body}.signature`;
}

describe("classifyAuthCookieState", () => {
  it("returns absent when no auth cookie exists", () => {
    expect(classifyAuthCookieState(makeRequest({}))).toBe("absent");
  });

  it("returns invalid for malformed session JSON", () => {
    expect(
      classifyAuthCookieState(
        makeRequest({ "sb-test-auth-token": "not-json" }),
      ),
    ).toBe("invalid");
  });

  it("returns invalid when access token is missing sub claim", () => {
    const token = makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(
      classifyAuthCookieState(
        makeRequest({
          "sb-test-auth-token": encodeSession({ access_token: token }),
        }),
      ),
    ).toBe("invalid");
  });

  it("returns refreshable for a valid access token", () => {
    const token = makeJwt({
      sub: "user-123",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    expect(
      classifyAuthCookieState(
        makeRequest({
          "sb-test-auth-token": encodeSession({ access_token: token }),
        }),
      ),
    ).toBe("refreshable");
  });

  it("returns refreshable when access token expired but refresh token exists", () => {
    const token = makeJwt({
      sub: "user-123",
      exp: Math.floor(Date.now() / 1000) - 3600,
    });
    expect(
      classifyAuthCookieState(
        makeRequest({
          "sb-test-auth-token": encodeSession({
            access_token: token,
            refresh_token: "refresh-token",
          }),
        }),
      ),
    ).toBe("refreshable");
  });
});
