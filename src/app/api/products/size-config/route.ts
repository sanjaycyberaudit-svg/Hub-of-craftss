import {
  getProductSizeConfig,
  getProductSizeConfigsByProductIds,
  type ProductSizeConfig,
} from "@/lib/products/sizeConfig";
import { STOREFRONT_REVALIDATE_SECONDS } from "@/lib/cache/constants";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = STOREFRONT_REVALIDATE_SECONDS;

function toApiPayload(config: ProductSizeConfig) {
  const configuredOptions = config.options.filter(
    (option) => Number(option.qty ?? 0) > 0,
  );
  return {
    enabled: config.enabled && configuredOptions.length > 0,
    options: configuredOptions,
  };
}

export async function GET(request: NextRequest) {
  try {
    const productId = request.nextUrl.searchParams.get("productId")?.trim();
    const productIdsParam = request.nextUrl.searchParams
      .get("productIds")
      ?.trim();

    if (productIdsParam) {
      const productIds = [
        ...new Set(
          productIdsParam
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean),
        ),
      ];
      if (productIds.length === 0) {
        return NextResponse.json(
          { message: "Missing productIds" },
          { status: 400 },
        );
      }

      const configs = await getProductSizeConfigsByProductIds(productIds);
      const payload: Record<string, ReturnType<typeof toApiPayload>> = {};
      productIds.forEach((id) => {
        payload[id] = toApiPayload(
          configs.get(id) ?? { enabled: false, options: [] },
        );
      });
      return NextResponse.json(payload, {
        headers: {
          "Cache-Control": `public, s-maxage=${STOREFRONT_REVALIDATE_SECONDS}, stale-while-revalidate=${STOREFRONT_REVALIDATE_SECONDS * 2}`,
        },
      });
    }

    if (!productId) {
      return NextResponse.json(
        { message: "Missing productId or productIds" },
        { status: 400 },
      );
    }

    const config = await getProductSizeConfig(productId);
    return NextResponse.json(toApiPayload(config), {
      headers: {
        "Cache-Control": `public, s-maxage=${STOREFRONT_REVALIDATE_SECONDS}, stale-while-revalidate=${STOREFRONT_REVALIDATE_SECONDS * 2}`,
      },
    });
  } catch (error) {
    console.error("[size-config] GET failed:", error);
    return NextResponse.json({ enabled: false, options: [] }, { status: 200 });
  }
}
