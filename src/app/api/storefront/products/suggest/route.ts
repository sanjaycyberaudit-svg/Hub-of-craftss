import { STOREFRONT_REVALIDATE_SECONDS } from "@/lib/cache/constants";
import { fetchProductNameSuggestionsCached } from "@/lib/storefront/product-name-suggest";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 300; // keep in sync with STOREFRONT_REVALIDATE_SECONDS

const CACHE_HEADERS = {
  "Cache-Control": `public, s-maxage=${STOREFRONT_REVALIDATE_SECONDS}, stale-while-revalidate=300`,
};

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const result = await fetchProductNameSuggestionsCached(
      params.get("q") ?? params.get("search"),
      params.get("limit"),
    );

    return NextResponse.json(result, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("[storefront/products/suggest] GET failed:", error);
    return NextResponse.json(
      { message: "Could not load suggestions.", query: null, suggestions: [] },
      { status: 500 },
    );
  }
}
