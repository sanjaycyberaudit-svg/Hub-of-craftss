"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  ChevronRight,
  FileText,
  Package,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Overview } from "@/features/cms/components/Overview";
import { RecentSales } from "@/features/cms/components/RecentSales";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type {
  DashboardStats,
  DashboardNotification,
} from "@/lib/admin/getDashboardStats";
import { cn, formatInr } from "@/lib/utils";
import { siteConfig } from "@/config/site";

type Props = {
  stats: DashboardStats;
  statsError?: string | null;
};

const panelClass = "border-border/70 bg-card shadow-none";
const sectionHeaderClass = "space-y-1 p-4 pb-0";
const sectionTitleClass = "text-sm font-semibold tracking-tight";
const sectionDescClass = "text-xs text-muted-foreground";
const metricLabelClass =
  "text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground";
const metricValueClass = "text-2xl font-semibold tracking-tight tabular-nums";

function ChangeLabel({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <span className="text-xs text-muted-foreground">No prior month data</span>
    );
  }
  const up = pct >= 0;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
      {up ? (
        <TrendingUp className="h-3 w-3 text-emerald-600" />
      ) : (
        <TrendingDown className="h-3 w-3 text-amber-600" />
      )}
      <span className={up ? "text-emerald-700" : "text-amber-700"}>
        {up ? "+" : ""}
        {pct}%
      </span>
      <span>vs last month</span>
    </p>
  );
}

function MetricCard({
  label,
  value,
  change,
  detail,
  alert,
}: {
  label: string;
  value: React.ReactNode;
  change?: React.ReactNode;
  detail?: React.ReactNode;
  alert?: React.ReactNode;
}) {
  return (
    <Card className={panelClass}>
      <CardContent className="p-4">
        <p className={metricLabelClass}>{label}</p>
        <div className={cn("mt-2", metricValueClass)}>{value}</div>
        {change}
        {detail ? (
          <p className="mt-1.5 text-xs text-muted-foreground">{detail}</p>
        ) : null}
        {alert}
      </CardContent>
    </Card>
  );
}

function notificationIcon(type: DashboardNotification["type"]) {
  switch (type) {
    case "order":
      return ShoppingBag;
    case "payment":
      return Wallet;
    default:
      return Package;
  }
}

function notificationTone(priority: DashboardNotification["priority"]) {
  if (priority === "high") {
    return {
      iconWrap: "bg-red-50 text-red-700 ring-1 ring-red-200",
      row: "hover:border-red-200 hover:bg-red-50/40",
    };
  }
  if (priority === "medium") {
    return {
      iconWrap: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
      row: "hover:border-amber-200 hover:bg-amber-50/40",
    };
  }
  return {
    iconWrap: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    row: "hover:border-emerald-200 hover:bg-emerald-50/40",
  };
}

function DashboardNotificationRow({
  notification,
}: {
  notification: DashboardNotification;
}) {
  const Icon = notificationIcon(notification.type);
  const tone = notificationTone(notification.priority);

  return (
    <li>
      <Link
        href={notification.href}
        className={cn(
          "flex items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-3 transition-colors",
          tone.row,
        )}
      >
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            tone.iconWrap,
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {notification.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {notification.description}
          </p>
        </div>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </Link>
    </li>
  );
}

function SectionCard({
  title,
  description,
  children,
  className,
  contentClassName,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn(panelClass, className)}>
      <CardHeader className={sectionHeaderClass}>
        <CardTitle className={sectionTitleClass}>{title}</CardTitle>
        {description ? (
          <CardDescription className={sectionDescClass}>
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className={cn("p-4 pt-3", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

/** Re-fetch server data when the admin returns to the tab (min 15s apart). */
function useRevalidateOnFocus() {
  const router = useRouter();
  const lastRefresh = useRef(Date.now());

  useEffect(() => {
    const REFRESH_MIN_INTERVAL_MS = 15_000;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastRefresh.current < REFRESH_MIN_INTERVAL_MS) return;
      lastRefresh.current = Date.now();
      router.refresh();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);
}

export function DashboardView({ stats, statsError }: Props) {
  useRevalidateOnFocus();

  return (
    <div className="space-y-5">
      {statsError ? (
        <div
          role="alert"
          className="rounded-md border border-amber-500/35 bg-amber-50/80 px-4 py-3 text-sm text-amber-950"
        >
          <p className="font-medium">Some dashboard data could not be loaded</p>
          <p className="mt-1 text-xs opacity-90">{statsError}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Dashboard
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/orders">View orders</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-auto w-full justify-start gap-0.5 overflow-x-auto rounded-lg bg-muted/60 p-1">
          <TabsTrigger value="overview" className="rounded-md px-3 py-1.5">
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-md px-3 py-1.5">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-md px-3 py-1.5">
            Reports
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="relative rounded-md px-3 py-1.5"
          >
            Notifications
            {stats.notifications.length > 0 ? (
              <Badge
                variant="secondary"
                className="ml-2 h-5 min-w-5 rounded-full px-1.5 text-[10px] font-medium"
              >
                {stats.notifications.length}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total revenue"
              value={formatInr(stats.totalRevenue)}
              change={<ChangeLabel pct={stats.revenueChangePct} />}
              detail={`Paid order totals incl. shipping & GST · This month ${formatInr(stats.revenueThisMonth)}`}
            />
            <MetricCard
              label="Paid orders"
              value={stats.paidOrdersCount}
              change={<ChangeLabel pct={stats.ordersChangePct} />}
              detail={`${stats.ordersThisMonth} this month · ${stats.pendingOrdersCount} need follow-up`}
            />
            <MetricCard
              label="Products"
              value={stats.totalProducts}
              detail={`${stats.featuredProducts} featured on homepage`}
              alert={
                stats.lowStockCount > 0 || stats.outOfStockCount > 0 ? (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-700">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {stats.lowStockCount} low · {stats.outOfStockCount} out of
                    stock
                  </p>
                ) : null
              }
            />
            <MetricCard
              label="Collections"
              value={stats.totalCollections}
              detail="Saree categories live"
              alert={
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {stats.totalCustomers} registered customers
                </p>
              }
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-7">
            <SectionCard
              className="col-span-4"
              title="Revenue overview"
              description="Paid orders — last 12 months (INR)"
              contentClassName="pl-2"
            >
              <Overview data={stats.monthlyRevenue} />
            </SectionCard>
            <SectionCard
              className="col-span-3"
              title="Recent paid orders"
              description={`Latest ${stats.recentPaidOrders.length} paid order${stats.recentPaidOrders.length === 1 ? "" : "s"}`}
            >
              <RecentSales
                orders={stats.recentPaidOrders}
                emptyMessage="No paid orders yet."
              />
            </SectionCard>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <SectionCard
              title="Pending payment orders"
              description="Contact customers who have not completed payment"
            >
              <RecentSales
                orders={stats.recentPendingOrders}
                emptyMessage="No pending payment orders right now."
              />
            </SectionCard>
            <SectionCard
              title="Recent paid orders"
              description="Latest completed sales for your records"
            >
              <RecentSales
                orders={stats.recentPaidOrders}
                emptyMessage="No paid orders yet."
              />
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <SectionCard title="Payment breakdown">
              <div className="space-y-2.5">
                {stats.ordersByPayment.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No orders yet.
                  </p>
                ) : (
                  stats.ordersByPayment.map(({ status, count }) => (
                    <div
                      key={status}
                      className="flex items-center justify-between border-b border-border/50 py-2 text-sm last:border-0"
                    >
                      <span className="capitalize text-foreground/90">
                        {status.replace(/_/g, " ")}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
            <SectionCard
              title="Top products (paid orders)"
              description={`Product line sales at checkout price · ${formatInr(stats.productSalesRevenue)} total (excl. shipping & GST)`}
            >
              <div className="space-y-2.5">
                {stats.topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No paid sales yet.
                  </p>
                ) : (
                  stats.topProducts.map((p) => (
                    <div
                      key={p.productId}
                      className="flex gap-2 border-b border-border/50 py-2 text-sm last:border-0"
                    >
                      {p.productExists ? (
                        <Link
                          href={`/admin/products/${p.productId}`}
                          className="min-w-0 flex-1 truncate font-medium hover:underline"
                        >
                          {p.name}
                        </Link>
                      ) : (
                        <span
                          className="min-w-0 flex-1 truncate font-medium text-muted-foreground"
                          title="Product no longer in catalog"
                        >
                          {p.name}
                          <span className="ml-1 text-[11px]">(removed)</span>
                        </span>
                      )}
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {p.quantity} sold · {formatInr(p.revenue)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
            <SectionCard title="Inventory health">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-border/50 py-2">
                  <span className="text-muted-foreground">Total products</span>
                  <span className="font-medium tabular-nums">
                    {stats.totalProducts}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/50 py-2">
                  <span className="text-muted-foreground">
                    Featured on home
                  </span>
                  <span className="font-medium tabular-nums">
                    {stats.featuredProducts}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/50 py-2 text-amber-800">
                  <span>Low stock (&lt;5)</span>
                  <span className="font-medium tabular-nums">
                    {stats.lowStockCount}
                  </span>
                </div>
                <div className="flex justify-between py-2 text-red-700">
                  <span>Out of stock</span>
                  <span className="font-medium tabular-nums">
                    {stats.outOfStockCount}
                  </span>
                </div>
              </div>
            </SectionCard>
          </div>
          <SectionCard title="Monthly revenue" contentClassName="pl-2">
            <Overview data={stats.monthlyRevenue} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="reports" className="mt-4 space-y-4">
          <SectionCard
            title={
              <span className="inline-flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Sales summary
              </span>
            }
            description={`Snapshot for ${siteConfig.name} — use Orders page for full detail`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 pr-4">Metric</th>
                    <th className="pb-2">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      Total revenue (paid)
                    </td>
                    <td className="py-2.5 font-medium tabular-nums">
                      {formatInr(stats.totalRevenue)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      Revenue this month
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {formatInr(stats.revenueThisMonth)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      Revenue last month
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {formatInr(stats.revenueLastMonth)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      Paid orders (total)
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {stats.paidOrdersCount}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      Paid orders this month
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {stats.ordersThisMonth}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      Pending / unpaid (follow-up)
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {stats.pendingOrdersCount}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      Active collections
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {stats.totalCollections}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      Catalog products
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {stats.totalProducts}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      Registered customers
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {stats.totalCustomers}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
              <Button size="sm" asChild>
                <Link href="/admin/orders">Open orders</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/admin/products">Open products</Link>
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-4">
          <SectionCard
            title={
              <span className="inline-flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                Store alerts
              </span>
            }
            description="Orders and inventory that need your attention"
          >
            {stats.notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                All clear — no pending alerts right now.
              </p>
            ) : (
              <ul className="space-y-2">
                {stats.notifications.map((n) => (
                  <DashboardNotificationRow key={n.id} notification={n} />
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
