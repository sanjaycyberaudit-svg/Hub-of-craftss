import type {
  ProductDetailPageQueryQuery,
  ProductDetailPageQueryQueryVariables,
} from "@/gql/graphql";
import { getClient } from "@/lib/urql";
import { CACHE_TAGS } from "@/lib/cache/constants";
import { withStorefrontCache } from "@/lib/cache/storefront-cache";
import { isProductSlugPublished } from "@/lib/storefront/product-visibility";
import { ProductDetailPageQueryDocument } from "./documents";

export async function getProductDetailCached(productSlug: string) {
  return withStorefrontCache(
    `sf:product:${productSlug}`,
    async () => {
      const { data, error } = await getClient().query<
        ProductDetailPageQueryQuery,
        ProductDetailPageQueryQueryVariables
      >(ProductDetailPageQueryDocument, { productSlug });
      if (error) throw error;
      return data;
    },
    { tags: [CACHE_TAGS.products, CACHE_TAGS.drafts] },
  );
}

/** Returns null when the slug is draft or missing — always checks live DB first. */
export async function getPublishedProductDetailCached(productSlug: string) {
  const published = await isProductSlugPublished(productSlug);
  if (!published) return null;
  return getProductDetailCached(productSlug);
}
