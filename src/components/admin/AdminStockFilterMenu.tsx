"use client";

import { ChevronDown, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminProductsStockFilter } from "@/lib/admin/getAdminProductsList";
import { cn } from "@/lib/utils";

const STOCK_FILTER_SHORT_LABELS: Record<AdminProductsStockFilter, string> = {
  all: "All",
  low: "Low stock",
  out: "Out of stock",
};

type AdminStockFilterMenuProps = {
  value: AdminProductsStockFilter;
  lowStockThreshold: number;
  onChange: (value: AdminProductsStockFilter) => void;
};

export function AdminStockFilterMenu({
  value,
  lowStockThreshold,
  onChange,
}: AdminStockFilterMenuProps) {
  const isActive = value !== "all";
  const activeLabel = STOCK_FILTER_SHORT_LABELS[value];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={isActive ? "secondary" : "outline"}
          className={cn(
            "h-10 shrink-0 gap-1.5",
            isActive && "border-primary/30 bg-primary/5",
          )}
          aria-label="Filter products by stock"
        >
          <Package className="h-4 w-4" aria-hidden />
          <span>Stock</span>
          {isActive ? (
            <span className="text-muted-foreground">· {activeLabel}</span>
          ) : null}
          <ChevronDown className="h-4 w-4 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Inventory status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as AdminProductsStockFilter)}
        >
          <DropdownMenuRadioItem value="all">
            All products
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="low">
            Low stock (&lt; {lowStockThreshold})
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="out">
            Out of stock (0)
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
