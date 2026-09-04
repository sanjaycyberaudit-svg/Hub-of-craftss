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
  internalRef: string | null;
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
  // Match SSR Tex: date window applies to paid list only (not unpaid/pending).
  const dateWhere =
    segment === "paid" ? buildDateWhereClause(dateFilter) : null;
  return dateWhere ? and(segmentWhere, dateWhere)! : segmentWhere;
}

async function countOrders(where: SQL): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(where);
  return Number(rows[0]?.count ?? 0);
}

/** Counts for the summary cards — paid respects date window; pending is all-time. */
export async function getAdminOrdersCounts(
  dateFilter?: AdminOrdersDateFilterState | null,
): Promise<{
  paid: number;
  pending: number;
}> {
  // One scan instead of two COUNT queries — critical on Vercel postgres.js max:1.
  // Paid card respects the date window; pending card is all-time (SSR Tex behavior).
  const paymentStatus = sql`lower(trim(${orders.payment_status}))`;
  const orderStatus = sql`lower(trim(coalesce(${orders.order_status}, '')))`;
  const paidPredicate = sql`${paymentStatus} in ('paid', 'success', 'captured')`;
  const pendingPredicate = sql`${orderStatus} <> 'cancelled' and (${orderStatus} = 'pending' or ${paymentStatus} in ('unpaid', 'pending', 'failed'))`;

  let paidFilter = paidPredicate;
  if (dateFilter) {
    const resolved = resolveAdminOrdersDateFilters(dateFilter);
    if (!resolved.allOrders && resolved.fromDate && resolved.toDate) {
      const { startUtc, endExclusiveUtc } = istDateRangeToUtcBounds(
        resolved.fromDate,
        resolved.toDate,
      );
      paidFilter = sql`${paidPredicate} and ${orders.createdAt} >= ${new Date(startUtc)} and ${orders.createdAt} < ${new Date(endExclusiveUtc)}`;
    }
  }

  const rows = await db
    .select({
      paid: sql<number>`count(*) filter (where ${paidFilter})::int`,
      pending: sql<number>`count(*) filter (where ${pendingPredicate})::int`,
    })
    .from(orders);

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
 *
 * Never throws for line/meta mapping failures — returns partial rows instead.
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

  // Select list columns. Retry without internal_ref if the column is missing
  // on an older DB (should not happen after migration 16).
  let orderRows: Array<{
    id: string;
    internalRef: string | null;
    createdAt: unknown;
    amount: unknown;
    orderStatus: string | null;
    paymentStatus: string;
    paymentMeta: unknown;
    customerName: string | null;
    customerMobile: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    addressCity: string | null;
    addressState: string | null;
    addressPostalCode: string | null;
    addressCountry: string | null;
  }>;

  try {
    orderRows = await db
      .select({
        id: orders.id,
        internalRef: orders.internal_ref,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/internal_ref/i.test(message)) throw error;
    console.warn(
      "[admin/orders] internal_ref select failed; retrying without column",
    );
    const fallback = await db
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
    orderRows = fallback.map((row) => ({ ...row, internalRef: null }));
  }

  if (orderRows.length === 0) {
    return { rows: [], totalCount, page, pageSize };
  }

  let linesByOrderId = new Map<string, AdminOrderLineView[]>();
  try {
    linesByOrderId = await loadOrderLinesByOrderId(
      orderRows.map((row) => row.id),
    );
  } catch (error) {
    console.error("[admin/orders] line items load failed:", error);
  }

  const rows: AdminOrderListView[] = [];
  for (const row of orderRows) {
    try {
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

      let checkoutOutcome: CheckoutOutcome | null = null;
      try {
        checkoutOutcome = resolveCheckoutOutcome({
          paymentStatus: row.paymentStatus,
          paymentMeta: row.paymentMeta,
        });
      } catch {
        checkoutOutcome = null;
      }

      rows.push({
        id: row.id,
        internalRef: row.internalRef ?? null,
        createdAt: toIsoCreatedAt(row.createdAt),
        amount: Number(row.amount) || 0,
        orderStatus: row.orderStatus,
        paymentStatus: row.paymentStatus || "unpaid",
        checkoutOutcome,
        customerName: row.customerName,
        customerMobile: row.customerMobile,
        shippingAddress,
        copyAddressText: buildShippingAddressCopyText({
          customerName: row.customerName,
          customerMobile: row.customerMobile,
          shippingAddress,
        }),
        lines: linesByOrderId.get(row.id) ?? [],
      });
    } catch (error) {
      console.error("[admin/orders] row map failed:", row.id, error);
      rows.push({
        id: row.id,
        internalRef: null,
        createdAt: toIsoCreatedAt(row.createdAt),
        amount: Number(row.amount) || 0,
        orderStatus: row.orderStatus,
        paymentStatus: row.paymentStatus || "unpaid",
        checkoutOutcome: null,
        customerName: row.customerName,
        customerMobile: row.customerMobile,
        shippingAddress: null,
        copyAddressText: buildShippingAddressCopyText({
          customerName: row.customerName,
          customerMobile: row.customerMobile,
          shippingAddress: null,
        }),
        lines: [],
      });
    }
  }

  return { rows, totalCount, page, pageSize };
}
