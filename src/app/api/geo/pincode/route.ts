import { STOREFRONT_REVALIDATE_SECONDS } from "@/lib/cache/constants";
import { withStorefrontCache } from "@/lib/cache/storefront-cache";
import {
  fetchIndiaPostPincode,
  normalizePincode,
} from "@/lib/geo/pincode-lookup";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 86400;

const CACHE_HEADERS = {
  "Cache-Control": `public, s-maxage=${STOREFRONT_REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
};

export async function GET(request: NextRequest) {
  try {
    const pin = normalizePincode(
      request.nextUrl.searchParams.get("pin") ??
        request.nextUrl.searchParams.get("pincode"),
    );

    if (!pin) {
      return NextResponse.json(
        { message: "Enter a valid 6-digit PIN code.", result: null },
        { status: 400 },
      );
    }

    const result = await withStorefrontCache(
      `sf:pincode:${pin}`,
      () => fetchIndiaPostPincode(pin),
      { revalidate: 86400 },
    );

    if (!result) {
      return NextResponse.json(
        {
          message: "PIN code not found. Please check and try again.",
          result: null,
        },
        { status: 404, headers: CACHE_HEADERS },
      );
    }

    return NextResponse.json({ result }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("[geo/pincode] GET failed:", error);
    return NextResponse.json(
      { message: "Could not look up PIN code.", result: null },
      { status: 500 },
    );
  }
}
