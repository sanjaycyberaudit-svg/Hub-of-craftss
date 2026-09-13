import type {
  CartItems,
  OptionSelections,
} from "@/features/carts/useCartStore";
import { toSizeConfigFromCartPayload } from "@/features/carts/lib/live-pricing";
import { fetchWithTimeout } from "@/lib/network/fetchWithTimeout";
import {
  areAllOptionGroupsSelected,
  resolveOptionSelections,
  type ProductSizeConfig,
} from "@/lib/products/sizeConfig-shared";

/** Payload shape returned by `/api/products/size-config` (single or batch). */
export type CartSizeConfigPayload = {
  enabled?: boolean;
  name?: string;
  options?: unknown[];
  groups?: unknown[];
};

/**
 * True when every required option group is selected.
 * Uses multi-group `selections` and/or legacy `size` — empty size alone does not fail.
 */
export function areCartSelectionsComplete(args: {
  sizeConfig: CartSizeConfigPayload | ProductSizeConfig | null | undefined;
  selections?: OptionSelections | null;
  size?: string | null;
}): boolean {
  const sizeConfig = toSizeConfigFromCartPayload(args.sizeConfig);
  const selections = resolveOptionSelections({
    sizeConfig,
    selections: args.selections,
    selectedSize: args.size,
  });
  return areAllOptionGroupsSelected(sizeConfig, selections);
}

/**
 * Product IDs whose cart lines still need option selections before checkout.
 */
export function findIncompleteCheckoutProductIds(args: {
  order: CartItems;
  sizeConfigsByProductId?: Record<
    string,
    CartSizeConfigPayload | ProductSizeConfig | undefined
  >;
}): string[] {
  const incomplete: string[] = [];
  for (const [productId, item] of Object.entries(args.order ?? {})) {
    const id = String(productId ?? "").trim();
    if (!id) continue;
    if (
      !areCartSelectionsComplete({
        sizeConfig: args.sizeConfigsByProductId?.[id],
        selections: item?.selections,
        size: item?.size,
      })
    ) {
      incomplete.push(id);
    }
  }
  return incomplete;
}

/** Batch-fetch size configs for cart/checkout guards. */
export async function fetchCartSizeConfigsByProductIds(
  productIds: string[],
): Promise<Record<string, CartSizeConfigPayload>> {
  const ids = [...new Set(productIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return {};
  const res = await fetchWithTimeout(
    `/api/products/size-config?productIds=${ids.map(encodeURIComponent).join(",")}`,
    { cache: "no-store" },
  );
  if (!res.ok) return {};
  const body = (await res.json()) as Record<string, CartSizeConfigPayload>;
  return body && typeof body === "object" ? body : {};
}

/**
 * Merge known cart-page configs with a batch fetch for any missing product IDs.
 */
export async function resolveCheckoutSizeConfigs(args: {
  productIds: string[];
  knownConfigs?: Record<
    string,
    CartSizeConfigPayload | ProductSizeConfig | undefined
  >;
  fetchConfigs?: (
    productIds: string[],
  ) => Promise<Record<string, CartSizeConfigPayload>>;
}): Promise<
  Record<string, CartSizeConfigPayload | ProductSizeConfig | undefined>
> {
  const known = args.knownConfigs ?? {};
  const missing = [
    ...new Set(
      args.productIds
        .map((id) => id.trim())
        .filter(Boolean)
        .filter((id) => known[id] === undefined),
    ),
  ];
  const merged: Record<
    string,
    CartSizeConfigPayload | ProductSizeConfig | undefined
  > = { ...known };
  if (missing.length === 0) return merged;
  const fetchConfigs = args.fetchConfigs ?? fetchCartSizeConfigsByProductIds;
  const fetched = await fetchConfigs(missing);
  for (const id of missing) {
    merged[id] = fetched[id];
  }
  return merged;
}
