import {
  DEFAULT_PRODUCT_OPTION_NAME,
  getProductSizeConfig,
  getProductSizeConfigsByProductIds,
  type ProductSizeConfig,
} from "@/lib/products/sizeConfig";
import { STOREFRONT_REVALIDATE_SECONDS } from "@/lib/cache/constants";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 120;
export const dynamic = "force-dynamic";

function toApiPayload(config: ProductSizeConfig) {
  const configuredOptions = config.options.filter(
    (option) => Number(option.qty ?? 0) > 0,
  );
  return {
    enabled: config.enabled && configuredOptions.length > 0,
    name: config.name || DEFAULT_PRODUCT_OPTION_NAME,
    options: configuredOptions.map((option) => ({
      value: option.value,
      // Legacy alias for older cart clients.
      size: option.value,
      qty: option.qty,
    })),
  };
}

const emptyPayload = {
  enabled: false,
  name: DEFAULT_PRODUCT_OPTION_NAME,
  options: [] as { value: string; size: string; qty: number }[],
};

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
          configs.get(id) ?? {
            enabled: false,
            name: DEFAULT_PRODUCT_OPTION_NAME,
            options: [],
          },
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
    return NextResponse.json(emptyPayload, { status: 200 });
  }
}
