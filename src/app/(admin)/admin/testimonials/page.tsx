import AdminShell from "@/components/admin/AdminShell";
import { gql } from "@/gql";
import { getClient } from "@/lib/urql";
import { notFound } from "next/navigation";
import {
  TestimonialsDataTable,
  TestimonialColumnsFragment,
} from "@/features/testimonials";

export const dynamic = "force-dynamic";

const AdminTestimonialsPageQuery = gql(/* GraphQL */ `
  query AdminTestimonialsPageQuery {
    testimonialsCollection(
      orderBy: [{ order: DescNullsLast }, { created_at: DescNullsLast }]
    ) {
      edges {
        node {
          __typename
          id
          ...TestimonialColumnsFragment
        }
      }
    }
  }
`);

async function TestimonialsAdminPage() {
  const { data } = await getClient().query(AdminTestimonialsPageQuery, {});

  if (!data) return notFound();

  return (
    <AdminShell heading="Testimonials">
      <TestimonialsDataTable data={data.testimonialsCollection?.edges || []} />
    </AdminShell>
  );
}

export default TestimonialsAdminPage;
