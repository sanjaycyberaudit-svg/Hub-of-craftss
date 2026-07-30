import {
  FetchCartQuery,
  FetchGuestCartQuery,
} from "@/features/carts/queries/cart-page-queries";
import type {
  FetchCartQueryQuery,
  FetchCartQueryQueryVariables,
  FetchGuestCartQueryQuery,
  FetchGuestCartQueryQueryVariables,
} from "@/gql/graphql";
import { getSessionUser } from "@/lib/auth/admin";
import {
  DEFAULT_PRODUCT_OPTION_NAME,
  getProductSizeConfigsByProductIds,
  type ProductSizeConfig,
} from "@/lib/products/sizeConfig";
import { withFallback } from "@/lib/resilience";
import { getClient } from "@/lib/urql";
import { cookies } from "next/headers";
import {
  guestCartProductIds,
  readGuestCartItemsFromCookies,
} from "./guest-cart-cookie";

export type CartSizeConfigPayload = {
  enabled: boolean;
  name: string;
  options: { value: string; size: string; qty: number }[];
};

function toApiSizePayload(config: ProductSizeConfig): CartSizeConfigPayload {
  const configuredOptions = config.options.filter(
    (option) => Number(option.qty ?? 0) > 0,
  );
  return {
    enabled: config.enabled && configuredOptions.length > 0,
    name: config.name || DEFAULT_PRODUCT_OPTION_NAME,
    options: configuredOptions.map((option) => ({
      value: option.value,
      size: option.value,
      qty: option.qty,
    })),
  };
}

export async function prefetchCartSizeConfigs(
  productIds: string[],
): Promise<Record<string, CartSizeConfigPayload>> {
  const unique = [...new Set(productIds.filter(Boolean))];
  if (unique.length === 0) return {};

  // Hydration shortcut only — the cart refetches these from /api/products/size-config,
  // so an empty prefetch degrades to a brief loading state instead of a crash.
  const configs = await withFallback(
    "cart:size-configs",
    () => getProductSizeConfigsByProductIds(unique),
    new Map<string, ProductSizeConfig>(),
    { attempts: 1 },
  );

  const payload: Record<string, CartSizeConfigPayload> = {};
  unique.forEach((id) => {
    payload[id] = toApiSizePayload(
      configs.get(id) ?? {
        enabled: false,
        name: DEFAULT_PRODUCT_OPTION_NAME,
        options: [],
      },
    );
  });
  return payload;
}

export async function prefetchGuestCartProducts(
  productIds: string[],
): Promise<FetchGuestCartQueryQuery | null> {
  const ids = [...new Set(productIds.filter(Boolean))];
  if (ids.length === 0) return null;

  const { data, error } = await getClient().query<
    FetchGuestCartQueryQuery,
    FetchGuestCartQueryQueryVariables
  >(FetchGuestCartQuery, {
    cartItems: ids,
    first: Math.max(ids.length, 1),
  });

  if (error) {
    console.error("[cart-server] guest products:", error.message);
    return null;
  }

  return data ?? null;
}

export async function prefetchUserCart(
  userId: string,
): Promise<FetchCartQueryQuery | null> {
  const { data, error } = await getClient().query<
    FetchCartQueryQuery,
    FetchCartQueryQueryVariables
  >(FetchCartQuery, { userId });

  if (error) {
    console.error("[cart-server] user cart:", error.message);
    return null;
  }

  return data ?? null;
}

export type CartPagePrefetch = {
  guestCartItems: ReturnType<typeof readGuestCartItemsFromCookies>;
  guestCartProducts: FetchGuestCartQueryQuery | null;
  userCart: FetchCartQueryQuery | null;
  sizeConfigs: Record<string, CartSizeConfigPayload>;
  prefetchedProductIds: string[];
};

export async function prefetchCartPageData(): Promise<CartPagePrefetch> {
  const cookieStore = await cookies();
  const user = await getSessionUser();
  const guestCartItems = readGuestCartItemsFromCookies(cookieStore);

  let guestCartProducts: FetchGuestCartQueryQuery | null = null;
  let userCart: FetchCartQueryQuery | null = null;
  const productIds: string[] = [];

  if (user) {
    userCart = await prefetchUserCart(user.id);
    const edges = userCart?.cartsCollection?.edges ?? [];
    edges.forEach((edge) => {
      if (edge.node.product_id) productIds.push(edge.node.product_id);
    });
  } else {
    const guestIds = guestCartProductIds(guestCartItems);
    if (guestIds.length > 0) {
      guestCartProducts = await prefetchGuestCartProducts(guestIds);
      productIds.push(...guestIds);
    }
  }

  const sizeConfigs = await prefetchCartSizeConfigs(productIds);

  return {
    guestCartItems,
    guestCartProducts,
    userCart,
    sizeConfigs,
    prefetchedProductIds: [...new Set(productIds)],
  };
}
