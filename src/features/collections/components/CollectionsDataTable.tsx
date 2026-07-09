"use client";

import { DataTable } from "@/features/cms";
import { ADMIN_COLLECTIONS_SEARCH } from "@/lib/admin/admin-search-config";
import { DocumentType } from "@/gql";
import CollectionsColumns, {
  CollectionColumnsFragment,
} from "./CollectionsColumns";

type CollectionRow = {
  node: DocumentType<typeof CollectionColumnsFragment>;
};

type CollectionsDataTableProps = {
  data: CollectionRow[];
};

export function CollectionsDataTable({ data }: CollectionsDataTableProps) {
  return (
    <DataTable
      columns={CollectionsColumns}
      data={data}
      search={ADMIN_COLLECTIONS_SEARCH}
      searchLayout="compact"
      newItemHref="/admin/collections/new"
      newItemLabel="New Category"
    />
  );
}
