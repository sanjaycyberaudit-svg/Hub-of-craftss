import { HOME_CATEGORIES_PAGE_SIZE } from "@/lib/storefront/collections-page";
import { fetchCollectionsPage } from "@/lib/storefront/collections-page.server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Paginated storefront categories for homepage scroll-to-load. */
export async function GET(request: NextRequest) {
  const firstRaw = Number(request.nextUrl.searchParams.get("first") ?? "");
  const first = Number.isFinite(firstRaw)
    ? firstRaw
    : HOME_CATEGORIES_PAGE_SIZE;
  const after = request.nextUrl.searchParams.get("after");

  try {
    const page = await fetchCollectionsPage({ first, after });
    return NextResponse.json(page, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("[storefront/collections] GET failed:", error);
    return NextResponse.json(
      { message: "Could not load categories." },
      { status: 500 },
    );
  }
}
