import AdminShell from "@/components/admin/AdminShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminOrdersSegmentTabs,
  parseOrdersSegment,
} from "@/features/orders/components/admin/AdminOrdersSegmentTabs";
import {
  adminOrdersDateFiltersFromSearchParams,
  createTodayDateFilters,
  resolveAdminOrdersDateFilters,
  type AdminOrdersDateFilterState,
} from "@/lib/admin/admin-orders-date-filter";
import {
  clampAdminOrdersPageSize,
  getAdminOrdersCounts,
  getAdminOrdersList,
  parseAdminOrdersPage,
} from "@/lib/admin/getAdminOrdersList";
import { publicErrorMessage } from "@/lib/api/public-error";
import { withDbAsync } from "@/lib/supabase/db";
import { Suspense } from "react";

function OrdersListOnlySkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  );
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const revalidate = 0;

const PAID_PAGE_PARAM = "paidPage";
const PENDING_PAGE_PARAM = "pendingPage";
const PAGE_SIZE_PARAM = "pageSize";
const STATUS_PARAM = "status";

/** Soft cap so pooler hangs fail as an Alert, not the admin error boundary. */
const ORDERS_PAGE_LOAD_TIMEOUT_MS = 20_000;

type AdminOrdersPageProps = {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`${label} timed out after ${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Match SSR Tex: do NOT wrap the async data load in Suspense.
 * Suspense around the whole page body re-suspends on URL changes and can
 * surface load failures via the page error boundary instead of the Alert.
 * Only the client tabs (useSearchParams) need a Suspense boundary.
 */
export default async function OrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  const resolved = await searchParams;
  return (
    <AdminShell heading="Orders">
      <OrdersPageContent searchParams={resolved} />
    </AdminShell>
  );
}

async function OrdersPageContent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const emptyList = {
    rows: [] as Awaited<ReturnType<typeof getAdminOrdersList>>["rows"],
    totalCount: 0,
    page: 1,
    pageSize: clampAdminOrdersPageSize(undefined),
  };

  let fetchError: string | null = null;
  let counts = { paid: 0, pending: 0 };
  let paid = emptyList;
  let unpaid = emptyList;
  let segment = parseOrdersSegment(firstParam(searchParams[STATUS_PARAM]));
  let dateFilter: AdminOrdersDateFilterState = createTodayDateFilters();
  let pageSize = emptyList.pageSize;

  try {
    pageSize = clampAdminOrdersPageSize(
      Number.parseInt(String(firstParam(searchParams[PAGE_SIZE_PARAM])), 10) ||
        undefined,
    );
    segment = parseOrdersSegment(firstParam(searchParams[STATUS_PARAM]));
    const paidPage = parseAdminOrdersPage(searchParams[PAID_PAGE_PARAM]);
    const pendingPage = parseAdminOrdersPage(searchParams[PENDING_PAGE_PARAM]);
    dateFilter = resolveAdminOrdersDateFilters(
      adminOrdersDateFiltersFromSearchParams({
        from: firstParam(searchParams.from),
        to: firstParam(searchParams.to),
        all: firstParam(searchParams.all),
        preset: firstParam(searchParams.preset),
      }),
    );

    // Sequential on purpose: Vercel uses a single postgres.js connection
    // (max: 1) against Supabase transaction pooler (port 6543). Concurrent
    // queries pipeline on that socket and hang until the request dies.
    const result = await withTimeout(
      withDbAsync(async () => {
        const nextCounts = await getAdminOrdersCounts(dateFilter);
        if (segment === "paid") {
          const nextPaid = await getAdminOrdersList({
            segment: "paid",
            page: paidPage,
            pageSize,
            dateFilter,
            totalCountHint: nextCounts.paid,
          });
          return { counts: nextCounts, paid: nextPaid, unpaid: emptyList };
        }

        const nextUnpaid = await getAdminOrdersList({
          segment: "pending",
          page: pendingPage,
          pageSize,
          dateFilter,
          totalCountHint: nextCounts.pending,
        });
        return { counts: nextCounts, paid: emptyList, unpaid: nextUnpaid };
      }),
      ORDERS_PAGE_LOAD_TIMEOUT_MS,
      "Admin orders load",
    );
    counts = result.counts;
    paid = result.paid;
    unpaid = result.unpaid;
  } catch (error) {
    console.error(
      `[admin/orders] page load failed (segment=${segment}):`,
      error,
    );
    fetchError =
      error instanceof Error && error.message.trim()
        ? error.message
        : publicErrorMessage(
            error,
            segment === "unpaid"
              ? "Failed to load unpaid orders."
              : "Failed to load paid orders.",
          );
  }

  const resetPageParams = [PAID_PAGE_PARAM, PENDING_PAGE_PARAM];

  return (
    <div className="space-y-6">
      {fetchError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not fully load orders</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      ) : null}

      <Suspense fallback={<OrdersListOnlySkeleton />}>
        <AdminOrdersSegmentTabs
          key={segment}
          segment={segment}
          counts={counts}
          paid={paid}
          unpaid={unpaid}
          paidPageParam={PAID_PAGE_PARAM}
          unpaidPageParam={PENDING_PAGE_PARAM}
          pageSizeParam={PAGE_SIZE_PARAM}
          resetPageParams={resetPageParams}
          dateFilter={dateFilter}
        />
      </Suspense>
    </div>
  );
}
