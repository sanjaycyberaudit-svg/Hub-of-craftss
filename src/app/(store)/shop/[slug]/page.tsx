import { Suspense } from "react";
import Header from "@/components/layouts/Header";
import { Shell } from "@/components/layouts/Shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AddProductToCartForm } from "@/features/carts";
import { ProductCommentsSection } from "@/features/comments";
import {
  BuyNowButton,
  LowStockNotice,
  ProductCard,
  ProductImageShowcase,
} from "@/features/products";
import { AddToWishListButton } from "@/features/wishlists";
import { STOREFRONT_REVALIDATE_SECONDS } from "@/lib/cache/constants";
import { getProductSizeConfig } from "@/lib/products/sizeConfig";
import { buildBreadcrumbJsonLd, buildProductJsonLd } from "@/lib/seo/json-ld";
import { getPublishedProductDetailCached } from "@/lib/storefront/product-detail";
import {
  ProductDiscountBadge,
  ProductPriceDisplay,
} from "@/features/products/components/ProductPriceDisplay";
import { getEffectiveProductPrice } from "@/lib/products/discount";
import { toProductDiscountFields } from "@/lib/products/pricing";
import { getCartProductPricingByIds } from "@/lib/storefront/cart-pricing";
import { keytoUrl } from "@/lib/utils";
import { JsonLd } from "@/components/seo/JsonLd";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export const revalidate = 120;

type Props = {
  params: Promise<{
    slug: string;
  }>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const data = await getPublishedProductDetailCached(resolvedParams.slug);
  const productName = data?.productsCollection?.edges?.[0]?.node?.name;
  const path = `/shop/${resolvedParams.slug}`;

  if (productName) {
    const productDescription =
      data?.productsCollection?.edges?.[0]?.node?.description?.trim() ||
      `Buy ${productName} online from Hub of craftss. Premium terracotta and craft supplies with secure checkout.`;
    return {
      title: productName,
      description: productDescription,
      alternates: {
        canonical: path,
      },
      openGraph: {
        title: `${productName} | Hub of craftss`,
        description: productDescription,
        url: path,
      },
    };
  }

  return {
    title: "Hub of craftss | Art & Craft Supplies",
    description:
      "Authentic terracotta and craft supplies — wholesale and retail",
  };
}

async function ProductDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const data = await getPublishedProductDetailCached(resolvedParams.slug);

  const productEdge = data?.productsCollection?.edges?.[0];
  if (!productEdge?.node) return notFound();

  const {
    id,
    name,
    description,
    stock,
    commentsCollection,
    totalComments,
    featuredImage,
  } = productEdge.node;
  const productSlug = resolvedParams.slug;
  const [sizeConfig, livePricing] = await Promise.all([
    getProductSizeConfig(id),
    getCartProductPricingByIds([id]),
  ]);
  const resolvedPricing = livePricing[id];
  const pricingProduct = resolvedPricing
    ? toProductDiscountFields(resolvedPricing)
    : productEdge.node;
  const hasConfiguredSizes =
    sizeConfig.enabled &&
    sizeConfig.options.some((option) => Number(option.qty ?? 0) > 0);

  const storefrontSizeLabels = sizeConfig.options
    .filter((option) => Number(option.qty ?? 0) > 0)
    .map((option) => {
      const size = String(option.size ?? "")
        .trim()
        .toUpperCase();
      if (!size) return `${option.qty}`;
      if (/^[A-Z]+$/.test(size)) return `${size} : ${option.qty}`;
      return size;
    });

  return (
    <Shell>
      <JsonLd
        data={[
          buildBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Shop", path: "/shop" },
            { name, path: `/shop/${productSlug}` },
          ]),
          buildProductJsonLd({
            name,
            slug: productSlug,
            description,
            price: getEffectiveProductPrice(pricingProduct),
            imageUrl: featuredImage?.key ? keytoUrl(featuredImage.key) : null,
            inStock: Number(stock ?? 0) > 0,
          }),
        ]}
      />
      <div className="grid grid-cols-12 gap-x-8">
        <div className="space-y-8 relative col-span-12 md:col-span-7">
          <div className="relative">
            <ProductDiscountBadge
              product={pricingProduct}
              className="absolute top-3 left-3 z-10"
            />
            <ProductImageShowcase data={productEdge.node} />
          </div>
        </div>

        <div className="col-span-12 md:col-span-5">
          <section className="flex justify-between items-start max-w-lg">
            <div>
              <h1 className="text-4xl font-semibold tracking-wide mb-3">
                {name}
              </h1>
              <ProductPriceDisplay
                product={pricingProduct}
                className="mb-3"
                saleClassName="text-2xl"
                originalClassName="text-base"
              />
              <LowStockNotice
                stock={stock}
                className="text-sm font-medium text-destructive"
              />
              {hasConfiguredSizes ? (
                <p className="text-sm text-muted-foreground">
                  Available sizes: {storefrontSizeLabels.join(", ")}
                </p>
              ) : null}
            </div>
            <AddToWishListButton productId={id} />
          </section>

          <section className="flex mb-8 items-end space-x-5">
            <Suspense>
              <AddProductToCartForm
                productId={id}
                stock={stock}
                sizeConfig={sizeConfig}
              />
            </Suspense>

            {!hasConfiguredSizes ? (
              <BuyNowButton productId={id} stock={stock} />
            ) : null}
          </section>

          <section className="space-y-6">
            {description?.trim() ? (
              <div>
                <h2 className="text-lg font-semibold tracking-wide mb-3">
                  About this product
                </h2>
                <p className="max-w-4xl text-base leading-[1.8] tracking-wide text-zinc-700 whitespace-pre-line">
                  {description.trim()}
                </p>
              </div>
            ) : null}

            <Accordion type="single" collapsible>
              <AccordionItem value="item-1">
                <AccordionTrigger>Is it accessible?</AccordionTrigger>
                <AccordionContent>
                  Yes. It adheres to the WAI-ARIA design pattern.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Is it accessible?</AccordionTrigger>
                <AccordionContent>
                  Yes. It adheres to the WAI-ARIA design pattern.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Ship & Returns</AccordionTrigger>
                <AccordionContent>
                  Shipping across Tamil Nadu and India. Free delivery on
                  selected orders — contact us on WhatsApp for details. Returns
                  or exchanges may be accepted within 7 days for unused items
                  with packaging; please call before returning.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>
        </div>
      </div>

      <Header heading={`We Think You'll Love`} />

      <div className="container grid grid-cols-2 lg:grid-cols-4 gap-x-8 ">
        {data.recommendations &&
          data.recommendations.edges.map(({ node }) => (
            <ProductCard key={node.id} product={node} />
          ))}
      </div>

      <ProductCommentsSection
        comments={
          commentsCollection
            ? commentsCollection.edges.map(({ node }) => node)
            : []
        }
        totalComments={totalComments}
      />
    </Shell>
  );
}

export default ProductDetailPage;
