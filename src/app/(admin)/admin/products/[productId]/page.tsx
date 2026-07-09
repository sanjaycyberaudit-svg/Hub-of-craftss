import AdminShell from "@/components/admin/AdminShell";
import { ProductForm } from "@/features/products";
import db from "@/lib/supabase/db";
import { products } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type EditProjectPageProps = {
  params: {
    productId: string;
  };
};

async function EditProjectPage({
  params: { productId },
}: EditProjectPageProps) {
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });
  if (!product) return notFound();

  return (
    <AdminShell
      heading="Edit Product"
      description="Update the fields below, then click Update to save changes."
    >
      <Suspense>
        <ProductForm product={product} />
      </Suspense>
    </AdminShell>
  );
}

export default EditProjectPage;
