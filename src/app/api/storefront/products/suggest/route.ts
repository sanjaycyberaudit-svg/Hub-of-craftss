import { publicCdnJson } from "@/lib/cache/public-cdn-cache";
import { fetchProductNameSuggestionsCached } from "@/lib/storefront/product-name-suggest";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const result = await fetchProductNameSuggestionsCached(
      params.get("q") ?? params.get("search"),
      params.get("limit"),
    );

    return publicCdnJson(result);
  } catch (error) {
    console.error("[storefront/products/suggest] GET failed:", error);
    return NextResponse.json(
      { message: "Could not load suggestions.", query: null, suggestions: [] },
      { status: 500 },
    );
  }
}
