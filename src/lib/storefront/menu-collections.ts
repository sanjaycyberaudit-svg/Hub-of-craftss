import { getAllCollectionsCached } from "@/lib/storefront/collections-list";

export type MenuCollection = {
  id: string;
  label: string;
  slug: string;
};

/** Storefront nav — same source as /collections and homepage category carousel. */
export async function getMenuCollectionsCached(): Promise<MenuCollection[]> {
  const data = await getAllCollectionsCached();
  return (data?.edges ?? [])
    .map(({ node }) => ({
      id: node.id,
      label: node.label?.trim() ?? "",
      slug: node.slug?.trim() ?? "",
    }))
    .filter((item) => item.id && item.label && item.slug);
}

export function collectionMenuHref(slug: string) {
  return `/collections/${slug}`;
}
