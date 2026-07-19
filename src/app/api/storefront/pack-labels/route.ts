import { getProductPackLabelsByIds } from "@/lib/products/pack.server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Public pack labels for catalog cards (display-only). */
export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids")?.trim() ?? "";
  const productIds = [
    ...new Set(
      idsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];

  if (productIds.length === 0) {
    return NextResponse.json({ labels: {} });
  }

  if (productIds.length > 80) {
    return NextResponse.json(
      { message: "Too many product ids in one request." },
      { status: 400 },
    );
  }

  try {
    const labels = await getProductPackLabelsByIds(productIds);
    return NextResponse.json(
      { labels },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    console.error("[storefront/pack-labels] GET failed:", error);
    return NextResponse.json(
      { message: "Could not load pack labels." },
      { status: 500 },
    );
  }
}
