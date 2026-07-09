"use client";

import type { MonthlyRevenuePoint } from "@/lib/admin/getDashboardStats";
import { formatInr } from "@/lib/utils";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

type Props = {
  data: MonthlyRevenuePoint[];
};

export function Overview({ data }: Props) {
  if (!data.some((d) => d.total > 0)) {
    return (
      <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
        No paid orders yet — revenue chart will appear after sales.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => formatInr(value)}
        />
        <Bar
          dataKey="total"
          fill="currentColor"
          radius={[4, 4, 0, 0]}
          className="fill-primary"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default Overview;
