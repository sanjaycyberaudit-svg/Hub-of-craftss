"use client";

import Link from "next/link";
import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import DeleteDialog from "@/components/ui/deleteDialog";
import { AdminSaveProgressOverlay } from "@/components/admin/AdminSaveProgressOverlay";
import { gql, DocumentType } from "@/gql";
import { fetchWithTimeout } from "@/lib/network/fetchWithTimeout";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

/** Each batch is small; allow headroom for media cleanup on slow networks. */
const CATEGORY_DELETE_BATCH_TIMEOUT_MS = 45_000;

export const CollectionColumnsFragment = gql(/* GraphQL */ `
  fragment CollectionColumnsFragment on collections {
    id
    label
    description
    slug
  }
`);

type DeleteBatchResponse = {
  message?: string;
  done?: boolean;
  remaining?: number;
  deletedIds?: string[];
  archivedIds?: string[];
};

function CollectionRowActions({
  collectionId,
  name,
}: {
  collectionId: string;
  name: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState({
    open: false,
    percent: 0,
    message: "Preparing…",
  });

  const onDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    let processed = 0;
    let total = 0;
    let deletedCount = 0;
    let archivedCount = 0;

    setProgress({
      open: true,
      percent: 0,
      message: "Checking products in this category…",
    });

    try {
      let done = false;
      let guard = 0;

      while (!done && guard < 200) {
        guard += 1;

        const res = await fetchWithTimeout("/api/admin/collections", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: collectionId }),
          timeoutMs: CATEGORY_DELETE_BATCH_TIMEOUT_MS,
        });

        const payload = (await res
          .json()
          .catch(() => null)) as DeleteBatchResponse | null;

        if (!res.ok) {
          throw new Error(payload?.message || "Delete failed");
        }

        const batchDeleted = payload?.deletedIds?.length ?? 0;
        const batchArchived = payload?.archivedIds?.length ?? 0;
        const remaining = Number(payload?.remaining ?? 0);
        const batchProcessed = batchDeleted + batchArchived;

        deletedCount += batchDeleted;
        archivedCount += batchArchived;
        processed += batchProcessed;

        if (total === 0) {
          total = Math.max(processed + remaining, 1);
        }

        done = Boolean(payload?.done);

        const rawPercent = done
          ? 100
          : Math.min(99, Math.round((processed / total) * 100));

        setProgress({
          open: true,
          percent: rawPercent,
          message: done
            ? "Finishing category cleanup…"
            : remaining > 0
              ? `Removing products & photos… ${processed} of ${total}`
              : "Finishing category cleanup…",
        });

        if (!done && batchProcessed === 0 && remaining > 0) {
          throw new Error("Delete made no progress. Please retry in a moment.");
        }
      }

      if (!done) {
        throw new Error("Delete took too long. Please retry.");
      }

      setProgress({
        open: true,
        percent: 100,
        message: "Done. Refreshing list…",
      });

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
      } else if (deletedCount > 0) {
        toast({
          title: `"${name}" deleted`,
          description: `${deletedCount} product(s) removed.`,
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
    } finally {
      setIsDeleting(false);
      setProgress((prev) => ({ ...prev, open: false, percent: 0 }));
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <AdminSaveProgressOverlay
        open={progress.open}
        title={`Deleting “${name}”`}
        message={progress.message}
        percent={progress.percent}
      />
      <Link href={`/admin/collections/${collectionId}`}>
        <Button
          size="sm"
          variant="outline"
          aria-label={`Edit ${name}`}
          disabled={isDeleting}
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
      </Link>
      <DeleteDialog
        isPending={isDeleting}
        pendingLabel="Deleting…"
        onClickHandler={() => {
          void onDelete();
        }}
        triggerLabel="Delete"
        title={`Delete "${name}"?`}
        description="Deletes all products and images inside. Products with paid orders are hidden from shop instead; their photos are removed after 30 days. Large categories may take a minute — progress will be shown."
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
