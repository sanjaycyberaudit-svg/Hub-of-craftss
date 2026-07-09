import AdminShell from "@/components/admin/AdminShell";
import { AdminTablePageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AdminOrdersList from "@/features/orders/components/admin/AdminOrdersList";
import {
  clampAdminOrdersPageSize,
  getAdminOrdersCounts,
  getAdminOrdersList,
  parseAdminOrdersPage,
} from "@/lib/admin/getAdminOrdersList";
import { publicErrorMessage } from "@/lib/api/public-error";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PAID_PAGE_PARAM = "paidPage";
const PENDING_PAGE_PARAM = "pendingPage";
const PAGE_SIZE_PARAM = "pageSize";

type AdminOrdersPageProps = {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function OrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  const resolved = await searchParams;
  return (
    <Suspense fallback={<AdminTablePageSkeleton statCards={2} tableRows={8} />}>
      <OrdersPageContent searchParams={resolved} />
    </Suspense>
  );
}

async function OrdersPageContent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const rawPageSize = searchParams[PAGE_SIZE_PARAM];
  const pageSize = clampAdminOrdersPageSize(
    Number.parseInt(
      String(Array.isArray(rawPageSize) ? rawPageSize[0] : rawPageSize),
      10,
    ) || undefined,
  );
  const paidPage = parseAdminOrdersPage(searchParams[PAID_PAGE_PARAM]);
  const pendingPage = parseAdminOrdersPage(searchParams[PENDING_PAGE_PARAM]);

  let fetchError: string | null = null;
  let counts = { paid: 0, pending: 0 };
  let paid: Awaited<ReturnType<typeof getAdminOrdersList>> = {
    rows: [],
    totalCount: 0,
    page: 1,
    pageSize,
  };
  let pending: Awaited<ReturnType<typeof getAdminOrdersList>> = {
    rows: [],
    totalCount: 0,
    page: 1,
    pageSize,
  };

  try {
    [counts, paid, pending] = await Promise.all([
      getAdminOrdersCounts(),
      getAdminOrdersList({ segment: "paid", page: paidPage, pageSize }),
      getAdminOrdersList({ segment: "pending", page: pendingPage, pageSize }),
    ]);
  } catch (error) {
    console.error("[admin/orders] page load failed:", error);
    fetchError = publicErrorMessage(error, "Failed to load orders.");
  }

  const resetPageParams = [PAID_PAGE_PARAM, PENDING_PAGE_PARAM];

  return (
    <AdminShell heading="Orders">
      <div className="space-y-6">
        {fetchError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not fully load orders</AlertTitle>
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-emerald-300/50 bg-emerald-50/40 p-4">
            <p className="text-xs uppercase tracking-wide text-emerald-700">
              Paid orders
            </p>
            <p className="mt-1 text-2xl font-semibold text-emerald-700">
              {counts.paid}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Counted in dashboard revenue and top products
            </p>
          </div>
          <div className="rounded-lg border border-amber-300/50 bg-amber-50/40 p-4">
            <p className="text-xs uppercase tracking-wide text-amber-700">
              Pending / unpaid
            </p>
            <p className="mt-1 text-2xl font-semibold text-amber-700">
              {counts.pending}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Follow up — ask why payment was not completed
            </p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Paid orders</h2>
          <p className="text-sm text-muted-foreground">
            Tap an order to open packing details. Copy address from the list or
            order page.
          </p>
          <AdminOrdersList
            orders={paid.rows}
            totalCount={paid.totalCount}
            page={paid.page}
            pageSize={paid.pageSize}
            pageParam={PAID_PAGE_PARAM}
            pageSizeParam={PAGE_SIZE_PARAM}
            resetPageParams={resetPageParams}
            emptyMessage="No paid orders yet."
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Pending / unpaid orders</h2>
          <p className="text-sm text-muted-foreground">
            Contact these customers — not included in sales analytics.
          </p>
          <AdminOrdersList
            orders={pending.rows}
            totalCount={pending.totalCount}
            page={pending.page}
            pageSize={pending.pageSize}
            pageParam={PENDING_PAGE_PARAM}
            pageSizeParam={PAGE_SIZE_PARAM}
            resetPageParams={resetPageParams}
            emptyMessage="No pending or unpaid orders."
          />
        </section>
      </div>
    </AdminShell>
  );
}
