import AdminShell from "@/components/admin/AdminShell";
import { CollectionForm } from "@/features/collections";

type Props = {};

async function NewProjectPage({}: Props) {
  return (
    <AdminShell
      heading="New Category"
      description="Add a category name, description, and image. The storefront URL is created automatically."
    >
      <CollectionForm />
    </AdminShell>
  );
}

export default NewProjectPage;
