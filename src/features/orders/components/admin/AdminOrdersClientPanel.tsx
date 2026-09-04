"use client";

import nextDynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminOrdersDateFilterState } from "@/lib/admin/admin-orders-date-filter";
import type { AdminOrdersListResult } from "@/lib/admin/getAdminOrdersList";
import type { OrdersSegment } from "@/lib/admin/admin-orders-segment";

function OrdersListOnlySkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  );
}

const AdminOrdersSegmentTabs = nextDynamic(
  () =>
    import("@/features/orders/components/admin/AdminOrdersSegmentTabs").then(
      (mod) => mod.AdminOrdersSegmentTabs,
    ),
  { ssr: false, loading: () => <OrdersListOnlySkeleton /> },
);

type Props = {
  segment: OrdersSegment;
  counts: { paid: number; pending: number };
  paid: AdminOrdersListResult;
  unpaid: AdminOrdersListResult;
  paidPageParam: string;
  unpaidPageParam: string;
  pageSizeParam: string;
  resetPageParams: string[];
  dateFilter: AdminOrdersDateFilterState;
};

/** Client wrapper so `next/dynamic({ ssr: false })` is legal (not in a Server Component). */
export function AdminOrdersClientPanel(props: Props) {
  return <AdminOrdersSegmentTabs {...props} />;
}
