import AdminShell from "@/components/admin/AdminShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AdminOrdersClientPanel } from "@/features/orders/components/admin/AdminOrdersClientPanel";
import {
  adminOrdersDateFiltersFromSearchParams,
  createThisMonthDateFilters,
  resolveAdminOrdersDateFilters,
  type AdminOrdersDateFilterState,
} from "@/lib/admin/admin-orders-date-filter";
import {
  clampAdminOrdersPageSize,
  getAdminOrdersCounts,
  getAdminOrdersList,
  parseAdminOrdersPage,
  type AdminOrdersListResult,
} from "@/lib/admin/getAdminOrdersList";
import { parseOrdersSegment } from "@/lib/admin/admin-orders-segment";
import { publicErrorMessage } from "@/lib/api/public-error";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const revalidate = 0;

const PAID_PAGE_PARAM = "paidPage";
const PENDING_PAGE_PARAM = "pendingPage";
const PAGE_SIZE_PARAM = "pageSize";
const STATUS_PARAM = "status";

type AdminOrdersPageProps = {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function emptyList(pageSize: number): AdminOrdersListResult {
  return {
    rows: [],
    totalCount: 0,
    page: 1,
    pageSize,
  };
}

export default async function OrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  const pageSizeDefault = clampAdminOrdersPageSize(undefined);
  let fetchError: string | null = null;
  let counts = { paid: 0, pending: 0 };
  let paid = emptyList(pageSizeDefault);
  let unpaid = emptyList(pageSizeDefault);
  let segment = parseOrdersSegment(undefined);
  let dateFilter: AdminOrdersDateFilterState = createThisMonthDateFilters();
  let pageSize = pageSizeDefault;

  try {
    const resolved = await searchParams;
    pageSize = clampAdminOrdersPageSize(
      Number.parseInt(String(firstParam(resolved[PAGE_SIZE_PARAM])), 10) ||
        undefined,
    );
    segment = parseOrdersSegment(firstParam(resolved[STATUS_PARAM]));
    const paidPage = parseAdminOrdersPage(resolved[PAID_PAGE_PARAM]);
    const pendingPage = parseAdminOrdersPage(resolved[PENDING_PAGE_PARAM]);

    const fromParams = adminOrdersDateFiltersFromSearchParams({
      from: firstParam(resolved.from),
      to: firstParam(resolved.to),
      all: firstParam(resolved.all),
      preset: firstParam(resolved.preset),
    });
    const hasExplicitDate =
      Boolean(firstParam(resolved.all)) ||
      Boolean(firstParam(resolved.preset)) ||
      Boolean(firstParam(resolved.from)) ||
      Boolean(firstParam(resolved.to));
    dateFilter = resolveAdminOrdersDateFilters(
      hasExplicitDate ? fromParams : createThisMonthDateFilters(),
    );

    counts = await getAdminOrdersCounts(dateFilter);
    if (segment === "paid") {
      paid = await getAdminOrdersList({
        segment: "paid",
        page: paidPage,
        pageSize,
        dateFilter,
        totalCountHint: counts.paid,
      });
      unpaid = emptyList(pageSize);
    } else {
      unpaid = await getAdminOrdersList({
        segment: "pending",
        page: pendingPage,
        pageSize,
        dateFilter,
        totalCountHint: counts.pending,
      });
      paid = emptyList(pageSize);
    }
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
    paid = emptyList(pageSize);
    unpaid = emptyList(pageSize);
    counts = { paid: 0, pending: 0 };
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

        <AdminOrdersClientPanel
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
      </div>
    </AdminShell>
  );
}
