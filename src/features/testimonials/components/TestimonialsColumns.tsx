"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import DeleteDialog from "@/components/ui/deleteDialog";
import { DocumentType } from "@/gql";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { fetchWithTimeout } from "@/lib/network/fetchWithTimeout";
import { TestimonialColumnsFragment } from "../query";

function TestimonialRowActions({ testimonialId }: { testimonialId: string }) {
  const router = useRouter();
  const { toast } = useToast();

  const onDelete = async () => {
    try {
      const res = await fetchWithTimeout("/api/admin/testimonials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: testimonialId }),
      });
      const payload = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!res.ok) {
        throw new Error(payload?.message || "Delete failed");
      }

      toast({ title: "Testimonial deleted." });
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
    <div className="flex items-center gap-2">
      <Link href={`/admin/testimonials/${testimonialId}`}>
        <Button size="sm" variant="outline">
          Edit
        </Button>
      </Link>
      <DeleteDialog
        onClickHandler={() => {
          void onDelete();
        }}
        triggerLabel="Delete"
        title="Delete testimonial?"
        description="This permanently removes the testimonial from the homepage carousel."
        actionLabel="Delete"
      />
    </div>
  );
}

const TestimonialsColumns: ColumnDef<{
  node: DocumentType<typeof TestimonialColumnsFragment>;
}>[] = [
  {
    accessorKey: "kind",
    header: () => <span>Type</span>,
    cell: ({ row }) => (
      <span className="capitalize text-muted-foreground">
        {row.original.node.kind === "video" ? "Video" : "Text"}
      </span>
    ),
  },
  {
    accessorKey: "customer_name",
    header: () => <span className="text-left">Customer</span>,
    cell: ({ row }) => {
      const item = row.original.node;
      return (
        <Link
          href={`/admin/testimonials/${item.id}`}
          className="font-medium hover:underline"
        >
          {item.customer_name}
        </Link>
      );
    },
  },
  {
    accessorKey: "location",
    header: () => <span>Location</span>,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.node.location || "—"}
      </span>
    ),
  },
  {
    accessorKey: "rating",
    header: () => <span className="block text-center">Rating</span>,
    cell: ({ row }) => (
      <span className="block text-center">
        {row.original.node.rating ?? 5}/5
      </span>
    ),
  },
  {
    accessorKey: "is_published",
    header: () => <span className="block text-center">Published</span>,
    cell: ({ row }) => (
      <span className="block text-center">
        {row.original.node.is_published ? "Yes" : "No"}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-center capitalize">Actions</div>,
    cell: ({ row }) => {
      const item = row.original.node;
      return <TestimonialRowActions testimonialId={item.id} />;
    },
  },
];

export default TestimonialsColumns;
