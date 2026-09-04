import {
  appendAdminOrdersDateParams,
  type AdminOrdersDateFilterState,
} from "@/lib/admin/admin-orders-date-filter";

export type OrdersSegment = "paid" | "unpaid";

const ORDERS_PATH = "/admin/orders";

export function parseOrdersSegment(
  value: string | null | undefined,
): OrdersSegment {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (raw === "unpaid" || raw === "pending") return "unpaid";
  return "paid";
}

export function segmentHref(
  nextSegment: OrdersSegment,
  pageSize: number,
  dateFilter: AdminOrdersDateFilterState,
) {
  const params = new URLSearchParams();
  params.set("status", nextSegment);
  if (pageSize > 0) params.set("pageSize", String(pageSize));
  appendAdminOrdersDateParams(params, dateFilter);
  return `${ORDERS_PATH}?${params.toString()}`;
}
