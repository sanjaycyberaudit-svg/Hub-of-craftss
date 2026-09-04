import { buildShippingAddressCopyText } from "@/lib/orders/shipping-address-text";
import {
  resolveCheckoutOutcome,
  type CheckoutOutcome,
} from "@/lib/checkout/checkout-outcome";
import {
  istDateRangeToUtcBounds,
  resolveAdminOrdersDateFilters,
  type AdminOrdersDateFilterState,
} from "@/lib/admin/admin-orders-date-filter";
import db from "@/lib/supabase/db";
import {
  address,
  medias,
  orderLines,
  orders,
  products,
} from "@/lib/supabase/schema";
import { keytoUrl } from "@/lib/utils";
import { and, desc, eq, gte, inArray, lt, sql, type SQL } from "drizzle-orm";
import {
  clampAdminOrdersPageSize,
  type AdminOrdersSegment,
} from "@/lib/admin/admin-orders-pagination";

export {
  ADMIN_ORDERS_DEFAULT_PAGE_SIZE,
  ADMIN_ORDERS_MAX_PAGE_SIZE,
  ADMIN_ORDERS_MIN_PAGE_SIZE,
  clampAdminOrdersPageSize,
  parseAdminOrdersPage,
  type AdminOrdersSegment,
} from "@/lib/admin/admin-orders-pagination";

export type AdminOrderLineView = {
  id: string;
  quantity: number;
  productName: string;
  productCode: string | null;
  imageUrl: string;
  imageAlt: string;
};

export type AdminOrderListView = {
  id: string;
  createdAt: string;
  amount: number;
  orderStatus: string | null;
  paymentStatus: string;
  checkoutOutcome: CheckoutOutcome | null;
  customerName: string | null;
  customerMobile: string | null;
  shippingAddress: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  } | null;
  copyAddressText: string;
  lines: AdminOrderLineView[];
};

export type AdminOrdersListParams = {
  segment: AdminOrdersSegment;
  page?: number;
  pageSize?: number;
  /** IST calendar date filter; omitted / all = no createdAt bound. */
  dateFilter?: AdminOrdersDateFilterState | null;
  /**
   * When the page already loaded segment counts, pass the matching total so we
   * skip a duplicate COUNT(*) (saves a pooler round-trip on Vercel max:1).
   */
  totalCountHint?: number;
};

export type AdminOrdersListResult = {
  rows: AdminOrderListView[];
  totalCount: number;
  page: number;
  pageSize: number;
};

/**
 * SQL equivalents of the JS classifiers in `paymentStatus.ts`. Kept in sync so
 * server-side pagination selects exactly the same orders as the old in-memory
 * `isPaidPaymentStatus` / `needsPaymentAttention` filters.
 */
function buildSegmentWhereClause(segment: AdminOrdersSegment): SQL {
  const paymentStatus = sql`lower(trim(${orders.payment_status}))`;
  const orderStatus = sql`lower(trim(coalesce(${orders.order_status}, '')))`;

  if (segment === "paid") {
    return sql`${paymentStatus} in ('paid', 'success', 'captured')`;
  }

  // "Needs attention": not cancelled AND (order pending OR payment unpaid/pending/failed).
  return sql`${orderStatus} <> 'cancelled' and (${orderStatus} = 'pending' or ${paymentStatus} in ('unpaid', 'pending', 'failed'))`;
}

function buildDateWhereClause(
  dateFilter?: AdminOrdersDateFilterState | null,
): SQL | null {
  if (!dateFilter) return null;
  const resolved = resolveAdminOrdersDateFilters(dateFilter);
  if (resolved.allOrders || !resolved.fromDate || !resolved.toDate) return null;
  const { startUtc, endExclusiveUtc } = istDateRangeToUtcBounds(
    resolved.fromDate,
    resolved.toDate,
  );
  // Drizzle types `createdAt` as Date even when the driver returns strings.
  return and(
    gte(orders.createdAt, new Date(startUtc)),
    lt(orders.createdAt, new Date(endExclusiveUtc)),
  )!;
}

function combineWhere(
  segment: AdminOrdersSegment,
  dateFilter?: AdminOrdersDateFilterState | null,
): SQL {
  const segmentWhere = buildSegmentWhereClause(segment);
  const dateWhere = buildDateWhereClause(dateFilter);
  return dateWhere ? and(segmentWhere, dateWhere)! : segmentWhere;
}

async function countOrders(where: SQL): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(where);
  return Number(rows[0]?.count ?? 0);
}

/** Counts for the summary cards — respect the active date window. */
export async function getAdminOrdersCounts(
  dateFilter?: AdminOrdersDateFilterState | null,
): Promise<{
  paid: number;
  pending: number;
}> {
  // One scan instead of two COUNT queries — critical on Vercel postgres.js max:1.
  const paymentStatus = sql`lower(trim(${orders.payment_status}))`;
  const orderStatus = sql`lower(trim(coalesce(${orders.order_status}, '')))`;
  const dateWhere = buildDateWhereClause(dateFilter);

  const rows = await db
    .select({
      paid: sql<number>`count(*) filter (where ${paymentStatus} in ('paid', 'success', 'captured'))::int`,
      pending: sql<number>`count(*) filter (where ${orderStatus} <> 'cancelled' and (${orderStatus} = 'pending' or ${paymentStatus} in ('unpaid', 'pending', 'failed')))::int`,
    })
    .from(orders)
    .where(dateWhere ?? sql`true`);

  return {
    paid: Number(rows[0]?.paid ?? 0),
    pending: Number(rows[0]?.pending ?? 0),
  };
}

function toIsoCreatedAt(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  const parsed = new Date(String(value ?? ""));
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return new Date(0).toISOString();
}

async function loadOrderLinesByOrderId(
  orderIds: string[],
): Promise<Map<string, AdminOrderLineView[]>> {
  const linesByOrderId = new Map<string, AdminOrderLineView[]>();
  if (orderIds.length === 0) return linesByOrderId;

  const lineRows = await db
    .select({
      id: orderLines.id,
      orderId: orderLines.orderId,
      quantity: orderLines.quantity,
      productName: products.name,
      productCode: products.productCode,
      imageKey: medias.key,
      imageAlt: medias.alt,
    })
    .from(orderLines)
    .leftJoin(products, eq(orderLines.productId, products.id))
    .leftJoin(medias, eq(products.featuredImageId, medias.id))
    .where(inArray(orderLines.orderId, orderIds));

  for (const row of lineRows) {
    const line: AdminOrderLineView = {
      id: row.id,
      quantity: row.quantity,
      productName: row.productName || "Product",
      productCode: row.productCode ?? null,
      imageUrl: keytoUrl(row.imageKey ?? undefined),
      imageAlt: row.imageAlt || row.productName || "Product image",
    };

    const existing = linesByOrderId.get(row.orderId) ?? [];
    existing.push(line);
    linesByOrderId.set(row.orderId, existing);
  }

  return linesByOrderId;
}

/**
 * Server-side paginated admin orders for a single segment (paid / pending).
 * Only the current page of orders — and their line items — are loaded, so the
 * page stays fast as the orders table grows.
 */
export async function getAdminOrdersList(
  params: AdminOrdersListParams,
): Promise<AdminOrdersListResult> {
  const pageSize = clampAdminOrdersPageSize(params.pageSize);
  const requestedPage = Math.max(1, Math.round(params.page ?? 1));
  const where = combineWhere(params.segment, params.dateFilter);

  const totalCount =
    typeof params.totalCountHint === "number" &&
    Number.isFinite(params.totalCountHint) &&
    params.totalCountHint >= 0
      ? Math.floor(params.totalCountHint)
      : await countOrders(where);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;

  const orderRows = await db
    .select({
      id: orders.id,
      createdAt: orders.createdAt,
      amount: orders.amount,
      orderStatus: orders.order_status,
      paymentStatus: orders.payment_status,
      paymentMeta: orders.payment_meta,
      customerName: orders.name,
      customerMobile: orders.customer_mobile,
      addressLine1: address.line1,
      addressLine2: address.line2,
      addressCity: address.city,
      addressState: address.state,
      addressPostalCode: address.postal_code,
      addressCountry: address.country,
    })
    .from(orders)
    .leftJoin(address, eq(orders.addressId, address.id))
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(pageSize)
    .offset(offset);

  if (orderRows.length === 0) {
    return { rows: [], totalCount, page, pageSize };
  }

  const linesByOrderId = await loadOrderLinesByOrderId(
    orderRows.map((row) => row.id),
  );

  const rows = orderRows.map((row) => {
    const shippingAddress = row.addressLine1
      ? {
          line1: row.addressLine1,
          line2: row.addressLine2,
          city: row.addressCity,
          state: row.addressState,
          postalCode: row.addressPostalCode,
          country: row.addressCountry,
        }
      : null;

    return {
      id: row.id,
      createdAt: toIsoCreatedAt(row.createdAt),
      amount: Number(row.amount),
      orderStatus: row.orderStatus,
      paymentStatus: row.paymentStatus,
      checkoutOutcome: resolveCheckoutOutcome({
        paymentStatus: row.paymentStatus,
        paymentMeta: row.paymentMeta,
      }),
      customerName: row.customerName,
      customerMobile: row.customerMobile,
      shippingAddress,
      copyAddressText: buildShippingAddressCopyText({
        customerName: row.customerName,
        customerMobile: row.customerMobile,
        shippingAddress,
      }),
      lines: linesByOrderId.get(row.id) ?? [],
    } satisfies AdminOrderListView;
  });

  return { rows, totalCount, page, pageSize };
}
