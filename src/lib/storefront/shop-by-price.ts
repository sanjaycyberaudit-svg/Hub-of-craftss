import { CACHE_TAGS } from "@/lib/cache/constants";
import { withStorefrontCache } from "@/lib/cache/storefront-cache";
import { loadCategorizedProductsForPricing } from "@/lib/storefront/categorized-products";
import {
  buildShopByPriceBuckets,
  type ShopByPriceBucket,
} from "./shop-by-price-buckets";

async function loadShopByPriceBuckets(): Promise<ShopByPriceBucket[]> {
  const rows = await loadCategorizedProductsForPricing();
  return buildShopByPriceBuckets(rows);
}

export async function getShopByPriceBucketsCached(): Promise<
  ShopByPriceBucket[]
> {
  return withStorefrontCache("sf:shop-by-price", loadShopByPriceBuckets, {
    revalidate: 300,
    tags: [CACHE_TAGS.products, CACHE_TAGS.drafts],
  });
}
