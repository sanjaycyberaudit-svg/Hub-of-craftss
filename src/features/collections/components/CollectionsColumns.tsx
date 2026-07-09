"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import DeleteDialog from "@/components/ui/deleteDialog";
import { gql, DocumentType } from "@/gql";
import { fetchWithTimeout } from "@/lib/network/fetchWithTimeout";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

export const CollectionColumnsFragment = gql(/* GraphQL */ `
  fragment CollectionColumnsFragment on collections {
    id
    label
    description
    slug
  }
`);

function CollectionRowActions({
  collectionId,
  name,
}: {
  collectionId: string;
  name: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const onDelete = async () => {
    try {
      const res = await fetchWithTimeout("/api/admin/collections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: collectionId }),
      });
      const payload = (await res.json().catch(() => null)) as {
        message?: string;
        deletedIds?: string[];
        archivedIds?: string[];
      } | null;

      if (!res.ok) {
        throw new Error(payload?.message || "Delete failed");
      }

      const deletedCount = payload?.deletedIds?.length ?? 0;
      const archivedCount = payload?.archivedIds?.length ?? 0;

      if (archivedCount > 0 && deletedCount > 0) {
        toast({
          title: `"${name}" deleted`,
          description: `${deletedCount} product(s) removed. ${archivedCount} with paid orders hidden for 30 days.`,
        });
      } else if (archivedCount > 0) {
        toast({
          title: `"${name}" deleted`,
          description: `${archivedCount} product(s) with paid orders hidden from shop (photos purge in 30 days).`,
        });
      } else {
        toast({ title: `"${name}" deleted.` });
      }
      router.refresh();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Please retry.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <Link href={`/admin/collections/${collectionId}`}>
        <Button size="sm" variant="outline" aria-label={`Edit ${name}`}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
      </Link>
      <DeleteDialog
        onClickHandler={() => {
          void onDelete();
        }}
        triggerLabel="Delete"
        title={`Delete "${name}"?`}
        description="Deletes all products and images inside. Products with paid orders are hidden from shop instead; their photos are removed after 30 days."
        actionLabel="Delete"
      />
    </div>
  );
}

const CollectionsColumns: ColumnDef<{
  node: DocumentType<typeof CollectionColumnsFragment>;
}>[] = [
  {
    accessorKey: "label",
    header: () => <div className="text-left capitalize">Category name</div>,
    cell: ({ row }) => {
      const collection = row.original.node;

      return (
        <Link
          href={`/admin/collections/${collection.id}`}
          className="text-center font-medium capitalize px-3 hover:underline"
        >
          {collection.label}
        </Link>
      );
    },
  },
  {
    accessorKey: "description",
    header: () => <div className="text-left">Description</div>,
    cell: ({ row }) => {
      const collection = row.original.node;

      return (
        <p className="max-w-md truncate px-3 text-sm text-muted-foreground">
          {collection.description}
        </p>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right capitalize">Actions</div>,
    cell: ({ row }) => {
      const collection = row.original.node;

      return (
        <CollectionRowActions
          collectionId={collection.id}
          name={collection.label}
        />
      );
    },
  },
];

export default CollectionsColumns;
