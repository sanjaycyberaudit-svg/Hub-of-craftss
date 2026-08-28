import type { DocumentType } from "@/gql";
import type { FetchCartQuery } from "./queries/cart-page-queries";
import type { CartItems } from "./useCartStore";

type FetchCartData = DocumentType<typeof FetchCartQuery>;

/** Map GraphQL cart edges → cookie/local cart (Hub: one line per product id). */
export function graphqlCartToCartItems(
  data: FetchCartData | null | undefined,
  existing?: CartItems,
): CartItems {
  const out: CartItems = {};
  const edges = data?.cartsCollection?.edges ?? [];

  for (const edge of edges) {
    const productId = edge.node.product_id;
    const product = edge.node.product;
    if (!productId || !product) continue;

    const quantity = Number(edge.node.quantity ?? 0);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    const preserved = existing?.[productId];
    out[productId] = {
      quantity,
      ...(preserved?.size ? { size: preserved.size } : {}),
      ...(preserved?.selections ? { selections: preserved.selections } : {}),
    };
  }

  return out;
}
