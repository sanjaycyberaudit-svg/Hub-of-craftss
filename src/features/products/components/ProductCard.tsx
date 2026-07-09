import React, { Suspense } from "react";
import Link from "next/link";
import { DocumentType, gql } from "@/gql";
import { cn } from "@/lib/utils";
import { ProductThumbnail } from "@/features/products/components/ProductThumbnail";
import { productThumbnailImageHoverClass } from "@/features/products/productThumbnail";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddToCartButton } from "@/features/carts";
import { AddToWishListButton } from "@/features/wishlists";
import { Rating } from "@/components/ui/rating";
import { BadgeType } from "@/lib/supabase/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/layouts/icons";
import LowStockNotice from "./LowStockNotice";
import ProductSizePreview from "./ProductSizePreview";
import {
  ProductDiscountBadge,
  ProductPriceDisplay,
} from "./ProductPriceDisplay";

type CardProps = React.ComponentProps<typeof Card>;

export type ProductCardProps = CardProps & {
  product: DocumentType<typeof ProductCardFragment>;
  priorityImage?: boolean;
};

export const ProductCardFragment = gql(/* GraphQL */ `
  fragment ProductCardFragment on products {
    id
    name
    description
    rating
    slug
    badge
    price
    discountEnabled: discount_enabled
    discountPercent: discount_percent
    stock
    featuredImage: medias {
      id
      key
      alt
    }
    collections {
      id
      label
      slug
    }
  }
`);

export function ProductCard({
  className,
  product,
  priorityImage = false,
  ...props
}: ProductCardProps) {
  const { id, name, slug, featuredImage, badge, stock } = product;

  return (
    <Card
      className={cn("w-full border-0 rounded-lg py-3 ", className)}
      {...props}
    >
      <CardContent className="relative p-0 mb-5">
        <Link href={`/shop/${slug}`} className="block">
          <ProductThumbnail
            imageKey={featuredImage.key}
            alt={featuredImage.alt || name}
            imageClassName={productThumbnailImageHoverClass}
            priority={priorityImage}
          />
        </Link>
        <ProductDiscountBadge
          product={product}
          className="absolute top-2 left-2 z-[1]"
        />
        {badge && (
          <Badge
            className="absolute top-2 right-2 z-[1]"
            variant={badge as BadgeType}
          >
            {badge}
          </Badge>
        )}
      </CardContent>

      <CardHeader className="p-0 mb-3 md:mb-5">
        <CardTitle>
          <Link href={`/shop/${slug}`} className="hover:underline">
            {name}
          </Link>
        </CardTitle>

        <div className="hidden md:block">
          <CardDescription className="max-w-[240px] line-clamp-2">
            {product.description}
          </CardDescription>
        </div>

        <ProductPriceDisplay product={product} />
        <LowStockNotice stock={stock} />
        <ProductSizePreview productId={id} />

        <div className="hidden md:block">
          <Rating value={product.rating} precision={0.5} readOnly />
        </div>
      </CardHeader>

      <CardFooter className="gap-x-2 md:gap-x-5 p-0 ">
        <Suspense
          fallback={
            <Button className="rounded-full p-0 h-8 w-8" disabled>
              <Icons.basket className="h-5 w-5 md:h-4 md:w-4" />
            </Button>
          }
        >
          <AddToCartButton productId={id} stock={stock} />
        </Suspense>

        <Suspense
          fallback={
            <Button className="rounded-full p-3" variant="ghost" disabled>
              <Icons.heart className={"w-4 h-4 fill-none"} />
            </Button>
          }
        >
          <AddToWishListButton productId={product.id} />
        </Suspense>
      </CardFooter>
    </Card>
  );
}

export default ProductCard;
