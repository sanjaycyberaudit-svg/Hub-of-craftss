import {
  handleVeloProductsRequest,
  type VeloProductsRequest,
} from "@/lib/integrations/velo-products-handler";
import {
  resolveVeloApiKey,
  touchVeloApiKeyUsage,
} from "@/lib/integrations/velo";
import { invalidateStorefrontCache } from "@/lib/cache/invalidate-storefront";
import { NextRequest, NextResponse } from "next/server";

const VELO_CORS_ORIGINS = new Set([
  "https://software-saree-order.vercel.app",
  "http://localhost:3000",
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
]);

function veloCorsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get("origin") ?? "";
  const allowOrigin = VELO_CORS_ORIGINS.has(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-velo-key",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(request: NextRequest) {
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

export async function POST(request: NextRequest) {
  const apiKey = extractApiKey(request);
  const resolvedKey = await resolveVeloApiKey(apiKey);
  if (!resolvedKey) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401, headers: veloCorsHeaders(request) },
    );
  }
  await touchVeloApiKeyUsage(resolvedKey.id);

  let body: VeloProductsRequest;
  try {
    body = (await request.json()) as VeloProductsRequest;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400, headers: veloCorsHeaders(request) },
    );
  }

  if (!body?.action || !body?.requestId) {
    return NextResponse.json(
      { ok: false, message: "action and requestId are required." },
      { status: 400, headers: veloCorsHeaders(request) },
    );
  }

  const result = await handleVeloProductsRequest(body);
  if (result.ok) {
    await invalidateStorefrontCache();
  }
  const status = result.ok ? 200 : 400;

  return NextResponse.json(result, {
    status,
    headers: veloCorsHeaders(request),
  });
}
