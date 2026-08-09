import {
  resolveVeloApiKey,
  touchVeloApiKeyUsage,
} from "@/lib/integrations/velo";
import { NextRequest, NextResponse } from "next/server";

export const VELO_CORS_ORIGINS = new Set([
  "https://software-saree-order.vercel.app",
  "http://localhost:3000",
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
]);

export function veloCorsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get("origin") ?? "";
  const allowOrigin = VELO_CORS_ORIGINS.has(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-velo-key",
    "Access-Control-Max-Age": "86400",
  };
}

export function veloOptionsResponse(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: veloCorsHeaders(request),
  });
}

function extractApiKey(request: NextRequest) {
  const headerKey = request.headers.get("x-velo-key")?.trim();
  if (headerKey) return headerKey;

  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return "";
}

export async function requireVeloApiRequest(request: NextRequest) {
  const apiKey = extractApiKey(request);
  const resolvedKey = await resolveVeloApiKey(apiKey);
  if (!resolvedKey) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401, headers: veloCorsHeaders(request) },
      ),
    };
  }
  await touchVeloApiKeyUsage(resolvedKey.id);
  return { ok: true as const, key: resolvedKey };
}
