"use client";
import { DocumentType } from "@/gql";
import { CartItemCardFragment } from "../fragments/CartItemCardFragment";

import Image from "next/image";
import React from "react";

import QuantityInput from "../../../components/layouts/QuantityInput";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ProductPriceDisplay } from "@/features/products/components/ProductPriceDisplay";
import { keytoUrl } from "@/lib/utils";
import { UseQueryExecute } from "@urql/next";
import Link from "next/link";
import { Icons } from "../../../components/layouts/icons";
import { Button } from "../../../components/ui/button";

export { CartItemCardFragment };

type CartItemCardProps = React.ComponentProps<typeof Card> & {
  product: DocumentType<typeof CartItemCardFragment>;
  disabled?: boolean;
  addOneHandler: () => void;
  minusOneHandler: () => void;
  removeHandler: () => void;
  quantity: number;
  selectedSize?: string;
  sizeRequired?: boolean;
  sizeOptions?: { value: string; label: string }[];
  onSizeChange?: (size: string) => void;
};

function CartItemCard({
  product,
  disabled,
  addOneHandler,
  minusOneHandler,
  removeHandler,
  quantity,
  selectedSize,
  sizeRequired,
  sizeOptions = [],
  onSizeChange,
}: CartItemCardProps) {
  const normalizedSelectedSize = String(selectedSize ?? "")
    .trim()
    .toUpperCase();
  const missingRequiredSize = Boolean(sizeRequired && !normalizedSelectedSize);

  return (
    <Card className="flex items-start gap-3 border-0 bg-transparent px-3 py-3 shadow-none md:items-center md:gap-6 md:px-5">
      <CardContent className="relative shrink-0 overflow-hidden p-0">
        <Image
          src={keytoUrl(product.featuredImage.key)}
          alt={product.featuredImage.alt}
          width={150}
          height={150}
          className="aspect-square h-[72px] w-[72px] rounded-md object-cover md:h-[120px] md:w-[120px]"
        />
      </CardContent>

      <CardHeader className="min-w-0 flex-1 space-y-2 p-0">
        <CardTitle className="text-sm font-semibold leading-snug md:text-base">
          <Link href={`/shop/${product.slug}`} className="hover:underline">
            {product.name}
          </Link>
        </CardTitle>
        {sizeRequired ? (
          <div className="mt-1 space-y-1">
            <label className="text-xs text-muted-foreground">Size</label>
            <select
              value={normalizedSelectedSize}
              disabled={disabled || sizeOptions.length === 0}
              className="h-8 w-full max-w-[220px] rounded border bg-background px-2 text-xs"
              onChange={(event) => onSizeChange?.(event.target.value)}
            >
              <option value="">Select size</option>
              {sizeOptions.map((option) => (
                <option
                  key={`${option.value}-${option.label}`}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
            {missingRequiredSize ? (
              <p className="text-[11px] text-destructive">
                Please select size to continue checkout.
              </p>
            ) : null}
          </div>
        ) : selectedSize ? (
          <p className="text-xs text-muted-foreground">Size: {selectedSize}</p>
        ) : null}

        <QuantityInput
          value={quantity}
          addOneHandler={addOneHandler}
          minusOneHandler={minusOneHandler}
          disabled={disabled}
          className="h-9 max-w-[7.5rem] px-2 py-1 md:h-12 md:max-w-36 md:px-4"
        />
      </CardHeader>

      <CardFooter className="flex shrink-0 flex-col items-end gap-1 p-0 md:flex-row md:items-center md:gap-3">
        <ProductPriceDisplay
          product={product}
          layout="inline"
          className="text-sm md:text-base"
        />

        <Button
          aria-label="Remove Item Button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={removeHandler}
        >
          <Icons.close size={18} />
        </Button>
      </CardFooter>
    </Card>
  );
}

export default CartItemCard;
