/**
 * Thin R2 proxy for Vercel (and other hosts without MEDIA_BUCKET).
 * Auth: Authorization: Bearer <MEDIA_PROXY_SECRET>
 */

type R2ObjectBody = {
  size: number;
  body: ReadableStream | null;
  httpMetadata?: { contentType?: string };
};

type R2BucketBinding = {
  put: (
    key: string,
    value: ArrayBuffer | ArrayBufferView | string | null,
    options?: {
      httpMetadata?: { contentType?: string; cacheControl?: string };
    },
  ) => Promise<unknown>;
  get: (key: string) => Promise<R2ObjectBody | null>;
  delete: (keys: string | string[]) => Promise<void>;
};

export interface Env {
  MEDIA_BUCKET: R2BucketBinding;
  MEDIA_PROXY_SECRET: string;
}

const MAX_BODY_BYTES = 8 * 1024 * 1024;

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function badRequest(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

function isAuthorized(request: Request, env: Env): boolean {
  const expected = env.MEDIA_PROXY_SECRET?.trim();
  if (!expected) return false;
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : header.trim();
  return token.length > 0 && token === expected;
}

function sanitizeKey(raw: string | null): string | null {
  if (!raw) return null;
  const key = decodeURIComponent(raw).trim();
  if (!key || key.includes("..") || key.includes("\\") || key.startsWith("/")) {
    return null;
  }
  return key;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!isAuthorized(request, env)) {
      return unauthorized();
    }

    if (url.pathname !== "/object") {
      return badRequest("Unknown path.");
    }

    if (request.method === "PUT") {
      const key = sanitizeKey(url.searchParams.get("key"));
      if (!key) return badRequest("Missing or invalid key.");

      const contentLength = Number(request.headers.get("content-length") || 0);
      if (
        Number.isFinite(contentLength) &&
        contentLength > 0 &&
        contentLength > MAX_BODY_BYTES
      ) {
        return badRequest("Body too large.");
      }

      const body = await request.arrayBuffer();
      if (body.byteLength === 0) return badRequest("Empty body.");
      if (body.byteLength > MAX_BODY_BYTES)
        return badRequest("Body too large.");

      const contentType =
        request.headers.get("content-type") || "application/octet-stream";
      const cacheControl = request.headers.get("cache-control") || undefined;

      await env.MEDIA_BUCKET.put(key, body, {
        httpMetadata: {
          contentType,
          cacheControl,
        },
      });

      return new Response(JSON.stringify({ ok: true, key }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET") {
      const key = sanitizeKey(url.searchParams.get("key"));
      if (!key) return badRequest("Missing or invalid key.");

      const obj = await env.MEDIA_BUCKET.get(key);
      if (!obj) {
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const headers = new Headers();
      const ct = obj.httpMetadata?.contentType;
      if (ct) headers.set("Content-Type", ct);
      headers.set("Content-Length", String(obj.size));
      return new Response(obj.body, { status: 200, headers });
    }

    if (request.method === "DELETE") {
      let keys: string[] = [];
      const single = sanitizeKey(url.searchParams.get("key"));
      if (single) {
        keys = [single];
      } else {
        const json = (await request.json().catch(() => null)) as {
          keys?: unknown;
        } | null;
        if (!json || !Array.isArray(json.keys)) {
          return badRequest("Expected { keys: string[] }.");
        }
        keys = [
          ...new Set(
            json.keys
              .filter((k): k is string => typeof k === "string")
              .map((k) => sanitizeKey(k))
              .filter((k): k is string => Boolean(k)),
          ),
        ];
      }
      if (keys.length === 0) return badRequest("No keys.");
      await env.MEDIA_BUCKET.delete(keys);
      return new Response(JSON.stringify({ ok: true, deleted: keys.length }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
};
