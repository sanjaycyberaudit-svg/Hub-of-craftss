"use client";
import { useToast } from "@/components/ui/use-toast";
import { useBulkOrderGuardConfig } from "@/providers/BulkOrderGuardProvider";
import { useStockControlConfig } from "@/providers/StockControlProvider";
import { User } from "@supabase/auth-helpers-nextjs";
import { useMutation, useQuery } from "@urql/next";
import { FetchCartQuery } from "../components/UserCartSection";
import { createCartMutation, updateCartsMutation } from "../query";
import { isBulkOrderQuantity } from "../constants/bulkOrder";
import useCartStore from "../useCartStore";

function useCartActions(
  user: User | null,
  productId: string,
  availableStock?: number | null,
) {
  const { toast } = useToast();
  const bulkOrder = useBulkOrderGuardConfig();
  const stockControl = useStockControlConfig();
  const [, addToCart] = useMutation(createCartMutation);
  const [, updateCart] = useMutation(updateCartsMutation);
  const addProductStorage = useCartStore((s) => s.addProductToCart);
  const setProductSize = useCartStore((s) => s.setProductSize);
  const guestCart = useCartStore((s) => s.cart);

  const [{ data }, refetch] = useQuery({
    query: FetchCartQuery,
    variables: {
      userId: user ? user.id : undefined,
    },
  });

  const authAddOrUpdateProduct = async (
    quantity: number,
    opts: { silent?: boolean; size?: string } = {},
  ) => {
    const size = opts.size;
    const existedProduct = data?.cartsCollection.edges.find(
      ({ node }) => node.product_id === productId,
    );
    const currentQuantity = existedProduct?.node.quantity ?? 0;
    const currentSize = guestCart[productId]?.size;
    if (size && currentQuantity > 0 && currentSize && currentSize !== size) {
      if (!opts.silent) {
        toast({
          title: "Size mismatch",
          description:
            "This product is already in cart with a different size. Remove it first, then add the new size.",
          variant: "destructive",
        });
      }
      return { blockedBulk: false, added: false };
    }
    if (
      bulkOrder.enabled &&
      isBulkOrderQuantity(currentQuantity + quantity, bulkOrder.threshold)
    ) {
      return { blockedBulk: true, added: false };
    }
    if (
      stockControl.enabled &&
      typeof availableStock === "number" &&
      currentQuantity + quantity > availableStock
    ) {
      if (!opts.silent) {
        toast({
          title: "Stock limit reached",
          description: `Only ${availableStock} left in stock for this product.`,
          variant: "destructive",
        });
      }
      return { blockedBulk: false, added: false };
    }
    try {
      let res;
      if (!existedProduct) {
        res = await addToCart({
          productId,
          userId: user.id,
          quantity,
        });
        refetch({ requestPolicy: "network-only" });
      } else {
        res = await updateCart({
          productId,
          userId: user.id,
          newQuantity: existedProduct.node.quantity + quantity,
        });
        refetch({ requestPolicy: "network-only" });
      }
      if (size) {
        setProductSize(productId, size);
      }
      if (res && !res.error && !opts.silent)
        toast({ title: "Success, Added a Product to the Cart." });
      return { blockedBulk: false, added: true };
    } catch {
      if (!opts.silent) toast({ title: "Error, Unexpected Error occurred." });
      return { blockedBulk: false, added: false };
    }
  };

  const guestAddProduct = (
    quantity: number,
    opts: { silent?: boolean; size?: string } = {},
  ) => {
    const size = opts.size;
    const currentQuantity = guestCart[productId]?.quantity ?? 0;
    const currentSize = guestCart[productId]?.size;
    if (size && currentQuantity > 0 && currentSize && currentSize !== size) {
      if (!opts.silent) {
        toast({
          title: "Size mismatch",
          description:
            "This product is already in cart with a different size. Remove it first, then add the new size.",
          variant: "destructive",
        });
      }
      return { blockedBulk: false, added: false };
    }
    if (
      bulkOrder.enabled &&
      isBulkOrderQuantity(currentQuantity + quantity, bulkOrder.threshold)
    ) {
      return { blockedBulk: true, added: false };
    }
    if (
      stockControl.enabled &&
      typeof availableStock === "number" &&
      currentQuantity + quantity > availableStock
    ) {
      if (!opts.silent) {
        toast({
          title: "Stock limit reached",
          description: `Only ${availableStock} left in stock for this product.`,
          variant: "destructive",
        });
      }
      return { blockedBulk: false, added: false };
    }
    addProductStorage(productId, quantity, size);
    if (!opts.silent) toast({ title: "Sucess, Added a Product to the Cart." });
    return { blockedBulk: false, added: true };
  };

  const addProductToCart = async (
    quantity: number,
    opts: { silent?: boolean; size?: string } | string = {},
  ) => {
    const normalizedOpts = typeof opts === "string" ? { size: opts } : opts;
    return !user
      ? guestAddProduct(quantity, normalizedOpts)
      : authAddOrUpdateProduct(quantity, normalizedOpts);
  };

  return { addProductToCart };
}

export default useCartActions;
