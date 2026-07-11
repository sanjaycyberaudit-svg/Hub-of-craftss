"use client";

import DataTable from "@/features/cms/components/DataTable";
import { DocumentType } from "@/gql";
import { TestimonialColumnsFragment } from "../query";
import TestimonialsColumns from "./TestimonialsColumns";

type TestimonialRow = {
  node: DocumentType<typeof TestimonialColumnsFragment>;
};

type TestimonialsDataTableProps = {
  data: TestimonialRow[];
};

export function TestimonialsDataTable({ data }: TestimonialsDataTableProps) {
  return (
    <DataTable
      columns={TestimonialsColumns}
      data={data}
      newItemHref="/admin/testimonials/new"
      newItemLabel="New testimonial"
    />
  );
}
