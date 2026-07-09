import AdminShell from "@/components/admin/AdminShell";
import { AdminTablePageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { ProductsColumns, ProductsDataTable } from "@/features/products";
import { publicErrorMessage } from "@/lib/api/public-error";
import { getAdminProductsList } from "@/lib/admin/getAdminProductsList";
import type { AdminProductsStockFilter } from "@/lib/admin/getAdminProductsList";
import { resolveStockControlConfig } from "@/lib/integrations/settings";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type AdminProjectsPageProps = {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function ProductsPage({
  searchParams,
}: AdminProjectsPageProps) {
  const resolved = await searchParams;
  return (
    <Suspense fallback={<AdminTablePageSkeleton tableRows={10} />}>
      <ProductsPageContent searchParams={resolved} />
    </Suspense>
  );
}

async function ProductsPageContent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  let productRows: Awaited<ReturnType<typeof getAdminProductsList>>["rows"] =
    [];
  let loadError: string | null = null;

  try {
    const page = Math.max(
      1,
      Number.parseInt(String(searchParams.page ?? "1"), 10) || 1,
    );
    const pageSize = Math.min(
      100,
      Math.max(
        10,
        Number.parseInt(String(searchParams.pageSize ?? "30"), 10) || 30,
      ),
    );
    const query =
      typeof searchParams.q === "string" ? searchParams.q.trim() : "";
    const stockParam =
      typeof searchParams.stock === "string" ? searchParams.stock : "all";
    const stockFilter: AdminProductsStockFilter =
      stockParam === "low" || stockParam === "out" ? stockParam : "all";

    const stockControl = await resolveStockControlConfig();
    const productsPage = await getAdminProductsList({
      page,
      pageSize,
      query,
      stockFilter,
      lowStockThreshold: stockControl.lowStockThreshold,
    });
    productRows = productsPage.rows;

    return (
      <AdminShell heading="Products">
        <ProductsDataTable
          columns={ProductsColumns}
          data={productRows}
          totalCount={productsPage.totalCount}
          page={productsPage.page}
          pageSize={productsPage.pageSize}
          appliedQuery={query}
          appliedStockFilter={stockFilter}
          lowStockThreshold={stockControl.lowStockThreshold}
          bulkDeleteEndpoint="/api/admin/products/manage"
          bulkDeleteLabel="Delete selected products"
          enableDragSelect
        />
      </AdminShell>
    );
  } catch (error) {
    console.error("[admin/products] page load failed:", error);
    loadError = publicErrorMessage(
      error,
      "Could not load products from the database.",
    );
  }

  return (
    <AdminShell heading="Products">
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm">
        <p className="font-semibold text-destructive">
          Failed to load products
        </p>
        <p className="mt-2 text-muted-foreground">{loadError}</p>
        <p className="mt-2 text-muted-foreground">
          Refresh the page. If this continues, check the database connection in
          Vercel environment variables.
        </p>
      </div>
    </AdminShell>
  );
}
