"use client";

import { useStockControlConfig } from "@/providers/StockControlProvider";

type LowStockNoticeProps = {
  stock: number | null;
  className?: string;
};

export default function LowStockNotice({
  stock,
  className,
}: LowStockNoticeProps) {
  const stockControl = useStockControlConfig();
  if (!stockControl.enabled || typeof stock !== "number") return null;
  if (stock < 0) return null;
  if (stock >= stockControl.lowStockThreshold) return null;

  const text = stock === 0 ? "Out of stock" : `Only ${stock} left`;
  return (
    <p className={className ?? "text-xs font-medium text-destructive"}>
      {text}
    </p>
  );
}
