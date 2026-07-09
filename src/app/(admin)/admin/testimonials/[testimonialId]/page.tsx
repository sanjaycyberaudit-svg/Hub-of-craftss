import AdminShell from "@/components/admin/AdminShell";
import { gql } from "@/gql";
import { getClient } from "@/lib/urql";
import { notFound } from "next/navigation";
import {
  TestimonialForm,
  TestimonialFormFragment,
} from "@/features/testimonials";

type Props = {
  params: { testimonialId: string };
};

const EditTestimonialPageQuery = gql(/* GraphQL */ `
  query EditTestimonialPageQuery($testimonialId: String) {
    testimonialsCollection(filter: { id: { eq: $testimonialId } }, first: 1) {
      edges {
        node {
          __typename
          id
          ...TestimonialFormFragment
        }
      }
    }
  }
`);

export default async function EditTestimonialPage({ params }: Props) {
  const { data } = await getClient().query(EditTestimonialPageQuery, {
    testimonialId: params.testimonialId,
  });

  const node = data?.testimonialsCollection?.edges?.[0]?.node;
  if (!node) return notFound();

  return (
    <AdminShell
      heading="Edit testimonial"
      description="Update customer feedback for the homepage carousel."
    >
      <TestimonialForm testimonial={node} />
    </AdminShell>
  );
}
