import AdminShell from "@/components/admin/AdminShell";
import { gql } from "@/gql";
import { getClient } from "@/lib/urql";
import { notFound } from "next/navigation";
import { CollectionsDataTable } from "@/features/collections";

/** Always load live collections from Supabase GraphQL (not build-time cache). */
export const dynamic = "force-dynamic";

type AdminCollectionsPageProps = {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
};

const AdminCollectionsPageQuery = gql(/* GraphQL */ `
  query AdminCollectionsPageQuery {
    collectionsCollection(orderBy: [{ label: AscNullsLast }]) {
      edges {
        node {
          __typename
          id
          ...CollectionColumnsFragment
        }
      }
    }
  }
`);

async function collectionsPage({ searchParams }: AdminCollectionsPageProps) {
  const { data } = await getClient().query(AdminCollectionsPageQuery, {});

  if (!data) return notFound();

  return (
    <AdminShell heading="Categories">
      <CollectionsDataTable data={data.collectionsCollection?.edges || []} />
    </AdminShell>
  );
}

export default collectionsPage;
