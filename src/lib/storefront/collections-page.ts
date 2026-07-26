import { CollectionCardFragment } from "@/features/collections";
import type { DocumentType } from "@/gql";
import { gql } from "@/gql";

export const HOME_CATEGORIES_PAGE_SIZE = 8;

export const CollectionsPageQuery = gql(/* GraphQL */ `
  query CollectionsPageQuery($first: Int!, $after: Cursor) {
    collectionsCollection(
      first: $first
      after: $after
      orderBy: [{ order: DescNullsLast }, { label: AscNullsLast }]
    ) {
      edges {
        node {
          id
          ...CollectionCardFragment
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`);

export type HomeCategoryNode = DocumentType<typeof CollectionCardFragment>;

export type HomeCategoriesPage = {
  edges: { node: HomeCategoryNode }[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor?: string | null;
  };
};
