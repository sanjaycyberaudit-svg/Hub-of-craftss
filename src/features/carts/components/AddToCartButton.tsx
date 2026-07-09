"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useBulkOrderGuardConfig } from "@/providers/BulkOrderGuardProvider";
import { useStockControlConfig } from "@/providers/StockControlProvider";
import { useToast } from "@/components/ui/use-toast";
import { Suspense, useState } from "react";

import { Icons } from "@/components/layouts/icons";
import { Button, ButtonProps } from "@/components/ui/button";
import BulkOrderGuardDialog from "./BulkOrderGuardDialog";
import { isBulkOrderQuantity } from "../constants/bulkOrder";
import useCartActions from "../hooks/useCartActions";

interface AddToCartButtonProps extends ButtonProps {
  productId: string;
  quantity?: number;
  cartId?: string;
  stock?: number | null;
}

function AddToCartButton({
  productId,
  quantity = 1,
  stock,
  disabled,
}: AddToCartButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const bulkOrder = useBulkOrderGuardConfig();
  const stockControl = useStockControlConfig();
  const { addProductToCart } = useCartActions(user, productId, stock ?? null);
  const [bulkGuardOpen, setBulkGuardOpen] = useState(false);
  const isOutOfStock =
    stockControl.enabled && typeof stock === "number" && stock <= 0;

  return (
    <Suspense>
      <Button
        className="rounded-full p-0 h-8 w-8"
        disabled={disabled || isOutOfStock}
        onClick={async () => {
          if (isOutOfStock) return;
          const sizeConfigRes = await fetch(
            `/api/products/size-config?productId=${encodeURIComponent(productId)}`,
            { cache: "no-store" },
          );
          if (sizeConfigRes.ok) {
            const sizeConfig = (await sizeConfigRes.json()) as {
              enabled?: boolean;
            };
            if (sizeConfig.enabled) {
              toast({
                title: "Select size first",
                description:
                  "This product has size options. Open product page and choose size before adding to cart.",
              });
              return;
            }
          }
          if (
            bulkOrder.enabled &&
            isBulkOrderQuantity(quantity, bulkOrder.threshold)
          ) {
            setBulkGuardOpen(true);
            return;
          }
          const res = await addProductToCart(quantity);
          if (res?.blockedBulk) {
            setBulkGuardOpen(true);
          }
        }}
      >
        <Icons.basket className="h-5 w-5 md:h-4 md:w-4" />
      </Button>
      <BulkOrderGuardDialog
        open={bulkGuardOpen}
        onOpenChange={setBulkGuardOpen}
      />
    </Suspense>
  );
}

export default AddToCartButton;
