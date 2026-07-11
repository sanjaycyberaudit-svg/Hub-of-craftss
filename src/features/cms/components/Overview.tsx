"use client";

import type { MonthlyRevenuePoint } from "@/lib/admin/getDashboardStats";
import { formatInr } from "@/lib/utils";

type Props = {
  data: MonthlyRevenuePoint[];
};

/** Simple CSS bars — avoids recharts (ReactCurrentOwner crash on Workers/Next 15). */
export function Overview({ data }: Props) {
  if (!data.some((d) => d.total > 0)) {
    return (
      <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
        No paid orders yet — revenue chart will appear after sales.
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="flex h-[350px] items-end gap-1.5 px-1 pb-6 pt-4 sm:gap-2">
      {data.map((point) => {
        const heightPct = Math.max(
          (point.total / max) * 100,
          point.total > 0 ? 4 : 0,
        );
        return (
          <div
            key={point.name}
            className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
            title={`${point.name}: ${formatInr(point.total)}`}
          >
            <div
              className="w-full max-w-[2.25rem] rounded-t-sm bg-primary/90 transition-colors hover:bg-primary"
              style={{ height: `${heightPct}%` }}
            />
            <span className="truncate text-[10px] text-muted-foreground sm:text-xs">
              {point.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default Overview;
