import { resolveOfferCodesConfig } from "@/lib/integrations/settings";
import {
  selectWelcomeOfferCode,
  type WelcomeOfferEligibility,
} from "@/lib/offers/welcome-code";
import { isFirstOrderForUser } from "@/lib/orders/first-order";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Tells the storefront whether the welcome code can still be used by this visitor. */
export async function GET() {
  try {
    const config = await resolveOfferCodesConfig();
    const welcome = selectWelcomeOfferCode(config);

    if (!welcome) {
      return NextResponse.json(
        { code: null, percentage: 0, eligible: false, signedIn: false },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const eligible = user ? await isFirstOrderForUser(user.id) : true;

    return NextResponse.json(
      {
        code: welcome.code,
        percentage: welcome.percentage,
        eligible,
        signedIn: Boolean(user),
      } satisfies WelcomeOfferEligibility,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[storefront/welcome-offer] GET failed:", error);
    return NextResponse.json(
      { message: "Could not load welcome offer." },
      { status: 500 },
    );
  }
}
