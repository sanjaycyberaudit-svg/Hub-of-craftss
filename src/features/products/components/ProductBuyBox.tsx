"use client";

import AddProductToCartForm from "@/features/carts/components/AddProductToCartForm";
import { ProductPriceDisplay } from "@/features/products/components/ProductPriceDisplay";
import type { ProductDiscountFields } from "@/lib/products/discount";
import {
  resolveProductPricingForSelection,
  toProductDiscountFields,
} from "@/lib/products/pricing";
import {
  getProductOptionDisplayName,
  getSelectableProductOptions,
  type ProductSizeConfig,
} from "@/lib/products/sizeConfig-shared";
import { useMemo, useState } from "react";

type ProductBuyBoxProps = {
  productId: string;
  stock?: number | null;
  sizeConfig: ProductSizeConfig;
  pricingProduct: ProductDiscountFields;
  packLabel?: string | null;
};

export function ProductBuyBox({
  productId,
  stock,
  sizeConfig,
  pricingProduct,
  packLabel,
}: ProductBuyBoxProps) {
  const [selectedOptionKey, setSelectedOptionKey] = useState("");
  const optionName = getProductOptionDisplayName(sizeConfig);
  const selectable = useMemo(
    () => getSelectableProductOptions(sizeConfig),
    [sizeConfig],
  );
  const hasSizeOptions = selectable.length > 0;

  const selectedOption = useMemo(() => {
    if (!hasSizeOptions || !selectedOptionKey) return null;
    return (
      selectable.find((option, index) => {
        const value = String(option.value ?? option.size ?? "")
          .trim()
          .toUpperCase();
        return `${index}-${value || "NO_LABEL"}` === selectedOptionKey;
      }) ?? null
    );
  }, [hasSizeOptions, selectedOptionKey, selectable]);

  const displayPricing = useMemo(() => {
    if (!hasSizeOptions) {
      return pricingProduct;
    }

    const selectedSize = selectedOption
      ? String(selectedOption.value ?? selectedOption.size ?? "")
      : "";
    const resolved = resolveProductPricingForSelection({
      product: pricingProduct,
      sizeConfig,
      selectedSize: selectedSize || undefined,
      preferMinWhenUnselected: !selectedOption,
    });
    return toProductDiscountFields(resolved);
  }, [hasSizeOptions, pricingProduct, selectedOption, sizeConfig]);

  const priceHint =
    hasSizeOptions && !selectedOption
      ? `Select a ${optionName.toLowerCase()} to confirm the final price. Showing from the lowest option.`
      : null;

  return (
    <div className="space-y-4">
      <div>
        <ProductPriceDisplay
          product={displayPricing}
          className="mb-1"
          saleClassName="text-2xl"
          originalClassName="text-base"
        />
        {priceHint ? (
          <p className="text-xs text-muted-foreground">{priceHint}</p>
        ) : null}
        {packLabel ? (
          <p className="mt-2 text-sm font-medium text-foreground/80">
            {packLabel}
            <span className="ml-1 font-normal text-muted-foreground">
              · Qty 1 = 1 set
            </span>
          </p>
        ) : null}
      </div>

      <AddProductToCartForm
        productId={productId}
        stock={stock}
        sizeConfig={sizeConfig}
        selectedOptionKey={selectedOptionKey}
        onSelectedOptionKeyChange={setSelectedOptionKey}
      />
    </div>
  );
}
