"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useClient, useMutation } from "@urql/next";
import useCartStore from "../useCartStore";
import { FetchCartQuery } from "./UserCartSection";
import {
  createCartMutation,
  RemoveCartsMutation,
  updateCartsMutation,
} from "../query";
import {
  claimDeepLink,
  isReplaceEntireCartDeepLink,
  linesFingerprint,
  linesToCartItems,
  parseDeepLinkLines,
  releaseDeepLinkInflight,
  type CartDeepLinkLine,
  wasDeepLinkProcessed,
} from "./cart-deeplink-utils";

export { parseCartItemsParam } from "./cart-deeplink-utils";

function CartDeepLinkAddRunner({
  lines,
  fingerprint,
  replaceEntireCart,
}: {
  lines: CartDeepLinkLine[];
  fingerprint: string;
  replaceEntireCart: boolean;
}) {
  const { user } = useAuth();
  const urqlClient = useClient();
  const replaceCart = useCartStore((s) => s.replaceCart);
  const setProductQuantity = useCartStore((s) => s.setProductQuantity);
  const ran = useRef(false);
  const finishedRef = useRef(false);
  const [, createCart] = useMutation(createCartMutation);
  const [, updateCart] = useMutation(updateCartsMutation);
  const [, removeCart] = useMutation(RemoveCartsMutation);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    releaseDeepLinkInflight(fingerprint);
  }, [fingerprint]);

  useEffect(() => {
    if (ran.current || lines.length === 0) return;
    ran.current = true;

    const apply = async () => {
      try {
        if (!user) {
          if (replaceEntireCart) {
            replaceCart(linesToCartItems(lines));
          } else {
            for (const line of lines) {
              setProductQuantity(line.productId, line.quantity);
            }
          }
          return;
        }

        const cartResult = await urqlClient
          .query(FetchCartQuery, { userId: user.id })
          .toPromise();
        const edges = cartResult.data?.cartsCollection?.edges ?? [];
        const targetIds = new Set(lines.map((line) => line.productId));

        if (replaceEntireCart) {
          for (const edge of edges) {
            if (!targetIds.has(edge.node.product_id)) {
              await removeCart({
                productId: edge.node.product_id,
                userId: user.id,
              });
            }
          }
        }

        for (const line of lines) {
          const existed = edges.some(
            (edge) => edge.node.product_id === line.productId,
          );
          if (existed) {
            await updateCart({
              productId: line.productId,
              userId: user.id,
              newQuantity: line.quantity,
            });
          } else {
            await createCart({
              productId: line.productId,
              userId: user.id,
              quantity: line.quantity,
            });
          }
        }

        if (replaceEntireCart) {
          replaceCart(linesToCartItems(lines));
        } else {
          for (const line of lines) {
            setProductQuantity(line.productId, line.quantity);
          }
        }
      } finally {
        finish();
      }
    };

    void apply();
  }, [
    createCart,
    finish,
    lines,
    removeCart,
    replaceCart,
    replaceEntireCart,
    setProductQuantity,
    updateCart,
    urqlClient,
    user,
  ]);

  return null;
}

function CartDeepLinkAddContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const consumedRef = useRef(false);
  const [pending, setPending] = useState<{
    lines: CartDeepLinkLine[];
    fingerprint: string;
    replaceEntireCart: boolean;
  } | null>(null);

  const queryKey = searchParams.toString();

  const urlLines = useMemo(
    () => parseDeepLinkLines(searchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- queryKey captures param changes
    [queryKey],
  );

  const replaceEntireCart = useMemo(
    () => isReplaceEntireCartDeepLink(searchParams),
    [searchParams],
  );

  useEffect(() => {
    if (consumedRef.current || urlLines.length === 0) return;

    const fingerprint = linesFingerprint(urlLines);
    consumedRef.current = true;

    if (wasDeepLinkProcessed(fingerprint)) {
      if (queryKey) router.replace("/cart", { scroll: false });
      return;
    }

    if (!claimDeepLink(fingerprint)) {
      if (queryKey) router.replace("/cart", { scroll: false });
      return;
    }

    if (queryKey) router.replace("/cart", { scroll: false });

    setPending({ lines: urlLines, fingerprint, replaceEntireCart });
  }, [queryKey, replaceEntireCart, router, urlLines]);

  if (!pending?.lines.length) return null;
  return (
    <CartDeepLinkAddRunner
      lines={pending.lines}
      fingerprint={pending.fingerprint}
      replaceEntireCart={pending.replaceEntireCart}
    />
  );
}

/** Velo share links: /cart?items=id:qty,id:qty or /cart?add=id&quantity=1 */
export default function CartDeepLinkAdd() {
  return (
    <Suspense fallback={null}>
      <CartDeepLinkAddContent />
    </Suspense>
  );
}
