import AdminShell from "@/components/admin/AdminShell";
import { gql } from "@/gql";
import { getClient } from "@/lib/urql";

import { notFound } from "next/navigation";
import { CollectionForm } from "@/features/collections";

type EditCollectionPageProps = {
  params: Promise<{
    collectionId: string;
  }>;
};

const updateCollectionPageQuery = gql(/* GraphQL */ `
  query UPDATE_COLLECTION_PAGE_QUERY($collectionId: String) {
    collectionsCollection(filter: { id: { eq: $collectionId } }, first: 1) {
      edges {
        node {
          __typename
          id
          ...CollectionFromFragment
        }
      }
    }
  }
`);

async function EditCollectionPage({ params }: EditCollectionPageProps) {
  const { collectionId } = await params;
  const { data } = await getClient().query(updateCollectionPageQuery, {
    collectionId,
  });
  if (!data || !data?.collectionsCollection?.edges[0]) return notFound();

  return (
    <AdminShell
      heading="Edit Category"
      description="Update the category name, description, or image."
    >
      <div className="">
        <CollectionForm collection={data.collectionsCollection.edges[0].node} />
      </div>
    </AdminShell>
  );
}

export default EditCollectionPage;
