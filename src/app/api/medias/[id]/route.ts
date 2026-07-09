import db from "@/lib/supabase/db";
import { medias } from "@/lib/supabase/schema";
import { keytoUrl } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const media = await db.query.medias.findFirst({
    where: eq(medias.id, params.id),
  });

  if (!media) {
    return NextResponse.json(
      {
        message: "Media not found.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      data: {
        id: media.id,
        alt: media.alt,
        url: keytoUrl(media.key),
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
