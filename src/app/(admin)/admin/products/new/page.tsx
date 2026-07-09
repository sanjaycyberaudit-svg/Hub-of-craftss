import { Suspense } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { ProductForm } from "@/features/products";

export const dynamic = "force-dynamic";

async function NewProductPage() {
  return (
    <AdminShell
      heading="Add Product"
      description="Fill in the fields below, then click Create to save the product."
    >
      <Suspense>
        <ProductForm />
      </Suspense>
    </AdminShell>
  );
}

export default NewProductPage;
