import { gql } from "@/gql";

export const CartItemCardFragment = gql(/* GraphQL */ `
  fragment CartItemCardFragment on products {
    id
    slug
    name
    price
    discountEnabled: discount_enabled
    discountPercent: discount_percent
    stock
    featuredImage: medias {
      id
      key
      alt
    }
  }
`);
