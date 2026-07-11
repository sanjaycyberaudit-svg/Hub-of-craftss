import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { RecentOrderRow } from "@/lib/admin/getDashboardStats";
import { formatOrderDateTimeIst } from "@/lib/datetime/india";
import { formatInr } from "@/lib/utils";
import Link from "next/link";

type Props = {
  orders: RecentOrderRow[];
  emptyMessage?: string;
};

function initials(name: string | null, email: string | null) {
  const base = name?.trim() || email?.trim() || "?";
  const parts = base.split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export function RecentSales({
  orders,
  emptyMessage = "No orders yet. Sales will show here when customers checkout.",
}: Props) {
  if (orders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/admin/orders/${order.id}`}
          className="flex items-center hover:opacity-80 transition-opacity"
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {initials(order.name, order.email)}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-0.5 min-w-0 flex-1">
            <p className="text-sm font-medium leading-none truncate">
              {order.name ?? "Guest"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {order.email ?? order.id}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {formatOrderDateTimeIst(order.createdAt)} · {order.payment_status}
            </p>
          </div>
          <div className="ml-auto shrink-0 text-right">
            <div className="text-sm font-medium tabular-nums">
              {formatInr(order.amount)}
            </div>
            {order.itemsSubtotal !== order.amount ? (
              <div className="text-[10px] text-muted-foreground tabular-nums">
                Items {formatInr(order.itemsSubtotal)}
              </div>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}

export default RecentSales;
