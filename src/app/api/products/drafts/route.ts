import { getDraftProductIdsCached } from "@/lib/storefront/draft-product-ids";
import { requireAdminApiUser } from "@/lib/auth/require-admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApiUser();
  if (auth.error) return auth.error;

  try {
    const ids = await getDraftProductIdsCached();
    return NextResponse.json(
      { ids },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("[products/drafts] GET failed:", error);
    return NextResponse.json({ ids: [] }, { status: 500 });
  }
}
