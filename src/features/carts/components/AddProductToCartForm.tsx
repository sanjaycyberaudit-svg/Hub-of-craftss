"use client";
import { QuantityInput } from "@/components/layouts/QuantityInput";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { useAuth } from "@/providers/AuthProvider";
import { useBulkOrderGuardConfig } from "@/providers/BulkOrderGuardProvider";
import { useStockControlConfig } from "@/providers/StockControlProvider";
import BulkOrderGuardDialog from "./BulkOrderGuardDialog";
import { isBulkOrderQuantity } from "../constants/bulkOrder";
import useCartActions from "../hooks/useCartActions";
import { AddProductCartData, AddProductToCartSchema } from "../validations";
import { useToast } from "@/components/ui/use-toast";
import type { ProductSizeConfig } from "@/lib/products/sizeConfig";

interface AddProductToCartFormProps {
  productId: string;
  stock?: number | null;
  sizeConfig?: ProductSizeConfig;
}

function AddProductToCartForm({
  productId,
  stock,
  sizeConfig,
}: AddProductToCartFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const bulkOrder = useBulkOrderGuardConfig();
  const stockControl = useStockControlConfig();
  const { addProductToCart } = useCartActions(user, productId, stock ?? null);
  const [bulkGuardOpen, setBulkGuardOpen] = useState(false);
  const [selectedOptionKey, setSelectedOptionKey] = useState<string>("");
  const selectableSizeOptions = (sizeConfig?.options ?? [])
    .map((option, index) => ({
      key: `${index}-${
        String(option.size ?? "")
          .trim()
          .toUpperCase() || "NO_LABEL"
      }`,
      size: String(option.size ?? "")
        .trim()
        .toUpperCase(),
      qty: Math.max(0, Number(option.qty ?? 0)),
    }))
    .filter((option) => option.qty > 0);
  const hasSizeOptions =
    Boolean(sizeConfig?.enabled) && selectableSizeOptions.length > 0;
  const selectedOption = selectableSizeOptions.find(
    (option) => option.key === selectedOptionKey,
  );
  const isOutOfStock =
    stockControl.enabled &&
    typeof stock === "number" &&
    stock <= 0 &&
    !hasSizeOptions;

  const getSizeLabel = (option: { size: string; qty: number }) => {
    if (!option.size) {
      return `${option.qty}`;
    }
    if (/^[A-Z]+$/.test(option.size)) {
      return `${option.size} : ${option.qty}`;
    }
    return option.size;
  };

  const form = useForm<AddProductCartData>({
    resolver: zodResolver(AddProductToCartSchema),
    defaultValues: {
      quantity: 1,
    },
  });

  async function onSubmit(values: AddProductCartData) {
    if (hasSizeOptions && !selectedOption) {
      toast({
        title: "Select size",
        description: "Please choose an available size before adding to cart.",
        variant: "destructive",
      });
      return;
    }
    const selectedSizeStock = hasSizeOptions ? selectedOption?.qty ?? 0 : null;
    if (
      stockControl.enabled &&
      ((typeof selectedSizeStock === "number" &&
        values.quantity > selectedSizeStock) ||
        (typeof selectedSizeStock !== "number" &&
          typeof stock === "number" &&
          values.quantity > stock))
    ) {
      toast({
        title: "Stock limit reached",
        description: `Only ${typeof selectedSizeStock === "number" ? selectedSizeStock : stock} left in stock for this product.`,
        variant: "destructive",
      });
      return;
    }
    if (
      bulkOrder.enabled &&
      isBulkOrderQuantity(values.quantity, bulkOrder.threshold)
    ) {
      setBulkGuardOpen(true);
      return;
    }
    const res = await addProductToCart(
      values.quantity,
      selectedOption?.size || undefined,
    );
    if (res?.blockedBulk) {
      setBulkGuardOpen(true);
    }
  }

  const addOne = () => {
    const currQuantity = form.getValues("quantity");
    const nextQuantity = currQuantity + 1;
    const selectedSizeStock = hasSizeOptions ? selectedOption?.qty ?? 0 : null;
    if (
      stockControl.enabled &&
      ((typeof selectedSizeStock === "number" &&
        nextQuantity > selectedSizeStock) ||
        (typeof selectedSizeStock !== "number" &&
          typeof stock === "number" &&
          nextQuantity > stock))
    ) {
      toast({
        title: "Stock limit reached",
        description: `Only ${typeof selectedSizeStock === "number" ? selectedSizeStock : stock} left in stock for this product.`,
        variant: "destructive",
      });
      return;
    }
    if (
      bulkOrder.enabled &&
      isBulkOrderQuantity(nextQuantity, bulkOrder.threshold)
    ) {
      setBulkGuardOpen(true);
      return;
    }
    form.setValue("quantity", nextQuantity);
  };
  const minusOne = () => {
    const currQuantity = form.getValues("quantity");
    if (currQuantity > 1) form.setValue("quantity", currQuantity - 1);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {hasSizeOptions ? (
          <FormItem>
            <FormLabel>Size</FormLabel>
            <FormControl>
              <div className="flex flex-wrap gap-2">
                {selectableSizeOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`rounded border px-3 py-1 text-sm ${
                      selectedOptionKey === option.key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background"
                    }`}
                    onClick={() => setSelectedOptionKey(option.key)}
                  >
                    {getSizeLabel(option)}
                  </button>
                ))}
                {selectableSizeOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No size stock available right now.
                  </p>
                ) : null}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        ) : null}
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <QuantityInput
                  {...field}
                  addOneHandler={addOne}
                  minusOneHandler={minusOne}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={
            isOutOfStock ||
            (hasSizeOptions && selectableSizeOptions.length === 0)
          }
        >
          {isOutOfStock ? "Out of stock" : "Add to Cart"}
        </Button>
        {isOutOfStock ? (
          <p className="text-sm text-destructive">
            This product is currently out of stock.
          </p>
        ) : null}
      </form>
      <BulkOrderGuardDialog
        open={bulkGuardOpen}
        onOpenChange={setBulkGuardOpen}
      />
    </Form>
  );
}

export default AddProductToCartForm;
