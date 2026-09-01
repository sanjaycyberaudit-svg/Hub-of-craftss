import {
  fetchFeaturedProductsCached,
  fetchProductSearchCached,
} from "@/lib/storefront/product-queries";
import { filterDraftProductsFromCollection } from "@/lib/storefront/filter-draft-products";
import { publicCdnJson } from "@/lib/cache/public-cdn-cache";
import {
  parseProductListRequest,
  type StorefrontProductSearchVariables,
} from "@/lib/storefront/search-params";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { mode, variables } = parseProductListRequest(
      request.nextUrl.searchParams,
    );

    if (mode === "featured") {
      const productsCollection = await filterDraftProductsFromCollection(
        await fetchFeaturedProductsCached(
          variables as { first: number; after?: string | null },
        ),
      );

      return publicCdnJson({
        productsCollection,
        matchingCollections: [],
      });
    }

    const searchResult = await fetchProductSearchCached(
      variables as StorefrontProductSearchVariables,
    );

    return publicCdnJson({
      ...searchResult,
      productsCollection: await filterDraftProductsFromCollection(
        searchResult.productsCollection,
      ),
    });
  } catch (error) {
    console.error("[storefront/products] GET failed:", error);
    return NextResponse.json(
      { message: "Could not load products." },
      { status: 500 },
    );
  }
}
