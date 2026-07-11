import { createServiceRoleClient } from "@/lib/supabase/service";
import { resolveStockControlConfig } from "@/lib/integrations/settings";
import {
  isPaidPaymentStatus,
  needsPaymentAttention,
  normalizeOrderStatus,
} from "@/lib/orders/paymentStatus";
import { cache } from "react";

export { isLiveCatalogProduct } from "@/lib/admin/catalog-product-metrics";

const ORDER_SUMMARY_SELECT =
  "id, amount, currency, email, name, payment_status, order_status, created_at, payment_meta";

const ORDER_LINES_SELECT =
  "orderId, product_id, quantity, price, product_name_snapshot";

const SUPABASE_IN_BATCH_SIZE = 300;

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type MonthlyRevenuePoint = {
  name: string;
  total: number;
  monthKey: string;
};

export type RecentOrderRow = {
  id: string;
  name: string | null;
  email: string | null;
  amount: number;
  itemsSubtotal: number;
  currency: string;
  payment_status: string;
  order_status: string | null;
  createdAt: Date;
};

export type DashboardNotification = {
  id: string;
  type: "order" | "stock" | "payment";
  title: string;
  description: string;
  href: string;
  priority: "high" | "medium" | "low";
};

export type TopProductRow = {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
  productExists: boolean;
};

export type DashboardStats = {
  totalRevenue: number;
  productSalesRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueChangePct: number | null;
  totalOrders: number;
  ordersThisMonth: number;
  ordersLastMonth: number;
  ordersChangePct: number | null;
  /** Live catalog SKU count (product rows), not stock units. */
  totalProducts: number;
  featuredProducts: number;
  /** Count of live products with stock in [1, lowStockThreshold). */
  lowStockCount: number;
  /** Count of live products with stock === 0. */
  outOfStockCount: number;
  /** Threshold used for low-stock product-row counts. */
  lowStockThreshold: number;
  totalCollections: number;
  totalCustomers: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  monthlyRevenue: MonthlyRevenuePoint[];
  recentOrders: RecentOrderRow[];
  recentPaidOrders: RecentOrderRow[];
  recentPendingOrders: RecentOrderRow[];
  notifications: DashboardNotification[];
  topProducts: TopProductRow[];
  ordersByPayment: { status: string; count: number }[];
};

type OrderRow = {
  id: string;
  amount: string | number;
  currency: string;
  email: string | null;
  name: string | null;
  payment_status: string;
  order_status: string | null;
  created_at: string;
  payment_meta?: unknown;
};

type ProductRow = {
  id: string;
  name: string;
  stock: number | null;
};

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function fetchOrderLinesByOrderIds(
  supabase: ReturnType<typeof createServiceRoleClient>,
  orderIds: string[],
): Promise<OrderLineRow[]> {
  if (orderIds.length === 0) return [];

  const batches = chunkArray(orderIds, SUPABASE_IN_BATCH_SIZE);
  const results = await Promise.all(
    batches.map((ids) =>
      supabase
        .from("order_lines")
        .select(ORDER_LINES_SELECT)
        .in("orderId", ids),
    ),
  );

  const firstError = results.find((result) => result.error)?.error;
  if (firstError) {
    throw new Error(firstError.message);
  }

  return results.flatMap((result) => (result.data ?? []) as OrderLineRow[]);
}

async function fetchPaidOrderLines(
  supabase: ReturnType<typeof createServiceRoleClient>,
  paidOrderIds: string[],
): Promise<OrderLineRow[]> {
  return fetchOrderLinesByOrderIds(supabase, paidOrderIds);
}

/** Product ids that still exist in the catalog (so dashboard links don't 404). */
async function fetchExistingProductIds(
  supabase: ReturnType<typeof createServiceRoleClient>,
  productIds: string[],
): Promise<Set<string>> {
  if (productIds.length === 0) return new Set();

  const batches = chunkArray(productIds, SUPABASE_IN_BATCH_SIZE);
  const results = await Promise.all(
    batches.map((ids) => supabase.from("products").select("id").in("id", ids)),
  );

  const firstError = results.find((result) => result.error)?.error;
  if (firstError) {
    throw new Error(firstError.message);
  }

  const existing = new Set<string>();
  for (const result of results) {
    for (const row of (result.data ?? []) as { id: string }[]) {
      existing.add(row.id);
    }
  }
  return existing;
}

type OrderLineRow = {
  orderId: string | null;
  product_id: string | null;
  quantity: number;
  price: string | number;
  product_name_snapshot: string | null;
};

function productNameFromLine(row: OrderLineRow): string {
  const snapshot = row.product_name_snapshot?.trim();
  if (snapshot) return snapshot;
  return "Product";
}

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function buildMonthlyRevenue(
  paidOrders: { amount: string | number; created_at: string }[],
): MonthlyRevenuePoint[] {
  const now = new Date();
  const points: MonthlyRevenuePoint[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    points.push({
      monthKey: key,
      name: MONTH_LABELS[d.getMonth()],
      total: 0,
    });
  }

  for (const order of paidOrders) {
    const d = toDate(order.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const point = points.find((p) => p.monthKey === key);
    if (point) point.total += Number(order.amount);
  }

  return points;
}

export function getEmptyDashboardStats(): DashboardStats {
  const now = new Date();
  const monthlyRevenue: MonthlyRevenuePoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyRevenue.push({
      monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      name: MONTH_LABELS[d.getMonth()],
      total: 0,
    });
  }
  return {
    totalRevenue: 0,
    productSalesRevenue: 0,
    revenueThisMonth: 0,
    revenueLastMonth: 0,
    revenueChangePct: null,
    totalOrders: 0,
    ordersThisMonth: 0,
    ordersLastMonth: 0,
    ordersChangePct: null,
    totalProducts: 0,
    featuredProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    lowStockThreshold: 5,
    totalCollections: 0,
    totalCustomers: 0,
    paidOrdersCount: 0,
    pendingOrdersCount: 0,
    monthlyRevenue,
    recentOrders: [],
    recentPaidOrders: [],
    recentPendingOrders: [],
    notifications: [],
    topProducts: [],
    ordersByPayment: [],
  };
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function buildOrderLineTotals(lines: OrderLineRow[]) {
  const totals = new Map<string, number>();
  for (const row of lines) {
    if (!row.orderId) continue;
    totals.set(
      row.orderId,
      (totals.get(row.orderId) ?? 0) + Number(row.price) * row.quantity,
    );
  }
  return totals;
}

function itemsSubtotalForOrder(
  order: OrderRow,
  lineTotals: Map<string, number>,
): number {
  const meta = (order.payment_meta as Record<string, unknown> | null) ?? {};
  const metaSubtotal = Number(meta.discountedSubtotal ?? meta.subtotalAmount);
  if (Number.isFinite(metaSubtotal) && metaSubtotal >= 0) {
    return metaSubtotal;
  }

  const lineTotal = lineTotals.get(order.id);
  if (typeof lineTotal === "number" && lineTotal >= 0) {
    return lineTotal;
  }

  return Number(order.amount);
}

function toRecentOrderRow(
  order: OrderRow,
  lineTotals: Map<string, number>,
): RecentOrderRow {
  return {
    id: order.id,
    name: order.name,
    email: order.email,
    amount: Number(order.amount),
    itemsSubtotal: itemsSubtotalForOrder(order, lineTotals),
    currency: order.currency,
    payment_status: order.payment_status,
    order_status: order.order_status,
    createdAt: toDate(order.created_at),
  };
}

export const getDashboardStats = cache(async (): Promise<DashboardStats> => {
  const supabase = createServiceRoleClient();
  const stockControl = await resolveStockControlConfig();
  const lowStockThreshold = Math.min(
    99,
    Math.max(1, Math.round(stockControl.lowStockThreshold || 5)),
  );

  // Catalog metrics count live product rows (SKUs), never sum of stock units.
  const [
    ordersRes,
    totalProductsRes,
    featuredProductsRes,
    lowStockCountRes,
    outOfStockCountRes,
    lowStockSampleRes,
    outOfStockSampleRes,
    collectionsRes,
    profilesRes,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select(ORDER_SUMMARY_SELECT)
      .order("created_at", { ascending: false }),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_draft", false)
      .is("archived_at", null),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("featured", true)
      .eq("is_draft", false)
      .is("archived_at", null),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_draft", false)
      .is("archived_at", null)
      .gte("stock", 1)
      .lt("stock", lowStockThreshold),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_draft", false)
      .is("archived_at", null)
      .eq("stock", 0),
    supabase
      .from("products")
      .select("id, name, stock")
      .eq("is_draft", false)
      .is("archived_at", null)
      .gte("stock", 1)
      .lt("stock", lowStockThreshold)
      .order("stock", { ascending: true })
      .limit(8),
    supabase
      .from("products")
      .select("id, name, stock")
      .eq("is_draft", false)
      .is("archived_at", null)
      .eq("stock", 0)
      .limit(5),
    supabase.from("collections").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  const firstError =
    ordersRes.error ||
    totalProductsRes.error ||
    featuredProductsRes.error ||
    lowStockCountRes.error ||
    outOfStockCountRes.error ||
    lowStockSampleRes.error ||
    outOfStockSampleRes.error ||
    collectionsRes.error ||
    profilesRes.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  const allOrders = (ordersRes.data ?? []) as OrderRow[];
  const paidOrderIds = allOrders
    .filter((order) => isPaidPaymentStatus(order.payment_status))
    .map((order) => order.id);
  const recentOrderIds = allOrders.slice(0, 6).map((order) => order.id);
  const [topProductRows, recentOrderLines] = await Promise.all([
    fetchPaidOrderLines(supabase, paidOrderIds),
    fetchOrderLinesByOrderIds(supabase, recentOrderIds),
  ]);

  const paidLineProductIds = [
    ...new Set(
      topProductRows
        .map((row) => row.product_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const existingProductIds = await fetchExistingProductIds(
    supabase,
    paidLineProductIds,
  );

  return computeStats({
    allOrders,
    existingProductIds,
    totalProducts: totalProductsRes.count ?? 0,
    featuredProducts: featuredProductsRes.count ?? 0,
    lowStockCount: lowStockCountRes.count ?? 0,
    outOfStockCount: outOfStockCountRes.count ?? 0,
    lowStockThreshold,
    lowStockRows: (lowStockSampleRes.data ?? []) as ProductRow[],
    outOfStockRows: (outOfStockSampleRes.data ?? []) as ProductRow[],
    collectionCount: collectionsRes.count ?? 0,
    customerCount: profilesRes.count ?? 0,
    topProductRows,
    recentOrderLines,
  });
});

function computeStats({
  allOrders,
  existingProductIds,
  totalProducts,
  featuredProducts,
  lowStockCount,
  outOfStockCount,
  lowStockThreshold,
  lowStockRows,
  outOfStockRows,
  collectionCount,
  customerCount,
  topProductRows,
  recentOrderLines,
}: {
  allOrders: OrderRow[];
  existingProductIds: Set<string>;
  totalProducts: number;
  featuredProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockThreshold: number;
  lowStockRows: ProductRow[];
  outOfStockRows: ProductRow[];
  collectionCount: number;
  customerCount: number;
  topProductRows: OrderLineRow[];
  recentOrderLines: OrderLineRow[];
}): DashboardStats {
  const now = new Date();
  const thisMonthStart = monthStart(now);
  const lastMonthStart = monthStart(
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
  );
  const twelveMonthsAgo = monthStart(
    new Date(now.getFullYear(), now.getMonth() - 11, 1),
  );

  const paidOrders = allOrders.filter((o) =>
    isPaidPaymentStatus(o.payment_status),
  );
  const paidOrderIds = new Set(paidOrders.map((o) => o.id));
  const paidInRange = paidOrders.filter(
    (o) => toDate(o.created_at) >= twelveMonthsAgo,
  );
  const lineTotals = buildOrderLineTotals([
    ...topProductRows,
    ...recentOrderLines,
  ]);

  const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.amount), 0);
  const paidOrderLines = topProductRows.filter(
    (row) => row.orderId && paidOrderIds.has(row.orderId),
  );
  const productSalesRevenue = paidOrderLines.reduce(
    (sum, row) => sum + Number(row.price) * row.quantity,
    0,
  );

  const ordersThisMonth = paidOrders.filter(
    (o) => toDate(o.created_at) >= thisMonthStart,
  );
  const ordersLastMonth = paidOrders.filter((o) => {
    const created = toDate(o.created_at);
    return created >= lastMonthStart && created < thisMonthStart;
  });

  const revenueThisMonth = paidOrders
    .filter((o) => toDate(o.created_at) >= thisMonthStart)
    .reduce((s, o) => s + Number(o.amount), 0);

  const revenueLastMonth = paidOrders
    .filter((o) => {
      const created = toDate(o.created_at);
      return created >= lastMonthStart && created < thisMonthStart;
    })
    .reduce((s, o) => s + Number(o.amount), 0);

  const paymentGroups = allOrders.reduce<Record<string, number>>((acc, o) => {
    const key = o.payment_status ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const notifications: DashboardNotification[] = [];

  const pending = allOrders.filter((o) => needsPaymentAttention(o));

  for (const order of pending.slice(0, 5)) {
    const customerLabel = (order.name ?? order.email ?? "Customer").trim();
    notifications.push({
      id: `order-${order.id}`,
      type: "order",
      title: "Unpaid order",
      description: `${customerLabel} · ${order.payment_status} · ${order.id.slice(0, 8)}`,
      href: `/admin/orders/${order.id}`,
      priority: "high",
    });
  }

  for (const p of lowStockRows.slice(0, 5)) {
    notifications.push({
      id: `stock-${p.id}`,
      type: "stock",
      title: `Low stock: ${p.name}`,
      description: `Only ${p.stock} left in inventory`,
      href: `/admin/products/${p.id}`,
      priority: "medium",
    });
  }

  for (const p of outOfStockRows.slice(0, 3)) {
    notifications.push({
      id: `out-${p.id}`,
      type: "stock",
      title: `Out of stock: ${p.name}`,
      description: "Restock or hide from shop",
      href: `/admin/products/${p.id}`,
      priority: "high",
    });
  }

  const unpaidPaid = allOrders.filter(
    (o) => normalizeOrderStatus(o.payment_status) === "unpaid",
  );
  if (unpaidPaid.length > 0 && notifications.length < 8) {
    notifications.push({
      id: "payment-unpaid",
      type: "payment",
      title: `${unpaidPaid.length} unpaid order(s)`,
      description: "Follow up on pending payments",
      href: "/admin/orders",
      priority: "medium",
    });
  }

  const productAgg = new Map<
    string,
    {
      productId: string;
      name: string;
      quantity: number;
      revenue: number;
      productExists: boolean;
    }
  >();
  for (const row of paidOrderLines) {
    const productKey = row.product_id ?? row.product_name_snapshot ?? "unknown";
    const name = productNameFromLine(row);
    const qty = row.quantity;
    const rev = Number(row.price) * qty;
    const existing = productAgg.get(productKey);
    if (existing) {
      existing.quantity += qty;
      existing.revenue += rev;
    } else {
      productAgg.set(productKey, {
        productId: row.product_id ?? productKey,
        name,
        quantity: qty,
        revenue: rev,
        productExists: row.product_id
          ? existingProductIds.has(row.product_id)
          : false,
      });
    }
  }
  const topProducts = [...productAgg.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    totalRevenue,
    productSalesRevenue,
    revenueThisMonth,
    revenueLastMonth,
    revenueChangePct: pctChange(revenueThisMonth, revenueLastMonth),
    totalOrders: allOrders.length,
    ordersThisMonth: ordersThisMonth.length,
    ordersLastMonth: ordersLastMonth.length,
    ordersChangePct: pctChange(ordersThisMonth.length, ordersLastMonth.length),
    totalProducts,
    featuredProducts,
    lowStockCount,
    outOfStockCount,
    lowStockThreshold,
    totalCollections: collectionCount,
    totalCustomers: customerCount,
    paidOrdersCount: paidOrders.length,
    pendingOrdersCount: pending.length,
    monthlyRevenue: buildMonthlyRevenue(paidInRange),
    recentOrders: allOrders
      .slice(0, 6)
      .map((order) => toRecentOrderRow(order, lineTotals)),
    recentPaidOrders: paidOrders
      .slice(0, 6)
      .map((order) => toRecentOrderRow(order, lineTotals)),
    recentPendingOrders: pending
      .slice(0, 6)
      .map((order) => toRecentOrderRow(order, lineTotals)),
    notifications: notifications.slice(0, 12),
    topProducts,
    ordersByPayment: Object.entries(paymentGroups).map(([status, n]) => ({
      status,
      count: n,
    })),
  };
}
