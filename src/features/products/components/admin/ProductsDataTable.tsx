"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { AdminStockFilterMenu } from "@/components/admin/AdminStockFilterMenu";
import { AdminTableSearch } from "@/components/admin/AdminTableSearch";
import { ADMIN_PRODUCTS_SEARCH } from "@/lib/admin/admin-search-config";
import type { AdminProductsStockFilter } from "@/lib/admin/getAdminProductsList";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { selectAllFilteredRows } from "@/lib/admin/table-search";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  totalCount: number;
  page: number;
  pageSize: number;
  appliedQuery?: string;
  appliedStockFilter?: AdminProductsStockFilter;
  lowStockThreshold?: number;
  enableDragSelect?: boolean;
  bulkDeleteEndpoint?: string;
  bulkDeleteLabel?: string;
  newProductHref?: string;
}

function DataTable<TData, TValue>({
  columns,
  data,
  totalCount,
  page,
  pageSize,
  appliedQuery: initialAppliedQuery = "",
  appliedStockFilter: initialAppliedStockFilter = "all",
  lowStockThreshold = 5,
  enableDragSelect = false,
  bulkDeleteEndpoint,
  bulkDeleteLabel = "Delete selected",
  newProductHref = "/admin/products/new",
}: DataTableProps<TData, TValue>) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [appliedSearch, setAppliedSearch] = React.useState(initialAppliedQuery);
  const [draftSearch, setDraftSearch] = React.useState(initialAppliedQuery);
  const [appliedStockFilter, setAppliedStockFilter] =
    React.useState<AdminProductsStockFilter>(initialAppliedStockFilter);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [drag, setDrag] = React.useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    additive: boolean;
    startSelection: RowSelectionState;
  } | null>(null);

  const tableWrapRef = React.useRef<HTMLDivElement | null>(null);
  const rowRefs = React.useRef<Record<string, HTMLTableRowElement | null>>({});

  const filteredData = data;

  React.useEffect(() => {
    setAppliedSearch(initialAppliedQuery);
    setDraftSearch(initialAppliedQuery);
  }, [initialAppliedQuery]);

  React.useEffect(() => {
    setAppliedStockFilter(initialAppliedStockFilter);
  }, [initialAppliedStockFilter]);

  const pushQueryParams = React.useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      Object.entries(next).forEach(([key, value]) => {
        if (value == null || value === "") params.delete(key);
        else params.set(key, value);
      });
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const applySearch = React.useCallback(
    (value?: string) => {
      const next = (value ?? draftSearch).trim();
      setAppliedSearch(next);
      setDraftSearch(next);
      setRowSelection({});
      pushQueryParams({ q: next || null, page: "1" });
    },
    [draftSearch, pushQueryParams],
  );

  const clearSearch = React.useCallback(() => {
    setAppliedSearch("");
    setDraftSearch("");
    setRowSelection({});
    pushQueryParams({ q: null, page: "1" });
  }, [pushQueryParams]);

  const applyStockFilter = React.useCallback(
    (value: AdminProductsStockFilter) => {
      setAppliedStockFilter(value);
      setRowSelection({});
      pushQueryParams({
        stock: value === "all" ? null : value,
        page: "1",
      });
    },
    [pushQueryParams],
  );

  const clearFilters = React.useCallback(() => {
    setAppliedSearch("");
    setDraftSearch("");
    setAppliedStockFilter("all");
    setRowSelection({});
    pushQueryParams({ q: null, stock: null, page: "1" });
  }, [pushQueryParams]);

  const changePageSize = React.useCallback(
    (value: string) => {
      setRowSelection({});
      pushQueryParams({ pageSize: value, page: "1" });
    },
    [pushQueryParams],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row, index) => {
      const item = row as Record<string, unknown>;
      const node = item.node as Record<string, unknown> | undefined;
      const nodeId = typeof node?.id === "string" ? node.id : null;
      const id = typeof item.id === "string" ? item.id : null;
      return nodeId || id || String(index);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedIds = React.useMemo(
    () =>
      Object.entries(rowSelection)
        .filter(([, selected]) => selected)
        .map(([id]) => id),
    [rowSelection],
  );
  const filteredCount = totalCount;
  const isSearchActive = appliedSearch.trim().length > 0;
  const isStockFilterActive = appliedStockFilter !== "all";
  const isFiltering = isSearchActive || isStockFilterActive;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const stockFilterSummary = isStockFilterActive
    ? appliedStockFilter === "low"
      ? `Low stock (< ${lowStockThreshold})`
      : "Out of stock"
    : null;

  const emptyResultsMessage = isSearchActive
    ? `No results for "${appliedSearch.trim()}".`
    : appliedStockFilter === "low"
      ? `No products with stock below ${lowStockThreshold}.`
      : appliedStockFilter === "out"
        ? "No out-of-stock products."
        : "No results.";

  React.useEffect(() => {
    if (!drag || !enableDragSelect) return;

    const onMouseMove = (event: MouseEvent) => {
      setDrag((prev) =>
        prev
          ? {
              ...prev,
              currentX: event.clientX,
              currentY: event.clientY,
            }
          : null,
      );
    };
    const onMouseUp = () => setDrag(null);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [drag, enableDragSelect]);

  React.useEffect(() => {
    if (!drag || !enableDragSelect || !tableWrapRef.current) return;

    const rect = new DOMRect(
      Math.min(drag.startX, drag.currentX),
      Math.min(drag.startY, drag.currentY),
      Math.abs(drag.currentX - drag.startX),
      Math.abs(drag.currentY - drag.startY),
    );

    const hits: RowSelectionState = {};
    for (const row of table.getRowModel().rows) {
      const node = rowRefs.current[row.id];
      if (!node) continue;
      const rowRect = node.getBoundingClientRect();
      const intersects = !(
        rect.right < rowRect.left ||
        rect.left > rowRect.right ||
        rect.bottom < rowRect.top ||
        rect.top > rowRect.bottom
      );
      if (intersects) hits[row.id] = true;
    }

    setRowSelection(drag.additive ? { ...drag.startSelection, ...hits } : hits);
  }, [drag, enableDragSelect, table]);

  const onBulkDelete = async () => {
    if (!bulkDeleteEndpoint || selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      const res = await fetch(bulkDeleteEndpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const payload = (await res.json().catch(() => null)) as {
        deletedIds?: string[];
        archivedIds?: string[];
        blocked?: { id: string; reason: string }[];
        message?: string;
      } | null;
      if (!res.ok) {
        throw new Error(payload?.message || "Bulk delete failed.");
      }
      const deleted = payload?.deletedIds?.length ?? 0;
      const archived = payload?.archivedIds?.length ?? 0;
      const blocked = payload?.blocked?.length ?? 0;
      setRowSelection({});
      router.refresh();
      toast({
        title: "Bulk delete completed",
        description: `Deleted: ${deleted}, Hidden (paid orders): ${archived}, Blocked: ${blocked}.`,
      });
    } catch (error) {
      toast({
        title: "Bulk delete failed",
        description: error instanceof Error ? error.message : "Please retry.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const dragOverlayStyle = React.useMemo(() => {
    if (!drag || !tableWrapRef.current) return undefined;
    const rootRect = tableWrapRef.current.getBoundingClientRect();
    return {
      left: Math.min(drag.startX, drag.currentX) - rootRect.left,
      top: Math.min(drag.startY, drag.currentY) - rootRect.top,
      width: Math.abs(drag.currentX - drag.startX),
      height: Math.abs(drag.currentY - drag.startY),
    };
  }, [drag]);

  return (
    <div className="space-y-4">
      <AdminTableSearch
        {...ADMIN_PRODUCTS_SEARCH}
        layout="compact"
        appliedQuery={appliedSearch}
        draftQuery={draftSearch}
        onDraftQueryChange={setDraftSearch}
        onApplySearch={applySearch}
        onClearSearch={clearSearch}
        filteredCount={filteredCount}
        totalCount={totalCount}
        hasActiveFilters={isFiltering}
        onClearAllFilters={clearFilters}
        filterSummary={stockFilterSummary}
        toolbarEnd={
          <AdminStockFilterMenu
            value={appliedStockFilter}
            lowStockThreshold={lowStockThreshold}
            onChange={applyStockFilter}
          />
        }
      />
      {bulkDeleteEndpoint || newProductHref ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {bulkDeleteEndpoint ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => selectAllFilteredRows(table, setRowSelection)}
                  disabled={filteredCount === 0}
                >
                  {isFiltering
                    ? `Select filtered (${filteredCount})`
                    : "Select all"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRowSelection({})}
                  disabled={selectedIds.length === 0}
                >
                  Clear
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void onBulkDelete()}
                  disabled={selectedIds.length === 0 || isDeleting}
                >
                  {isDeleting
                    ? "Deleting..."
                    : `${bulkDeleteLabel} (${selectedIds.length})`}
                </Button>
                {enableDragSelect ? (
                  <span className="text-xs text-muted-foreground">
                    Tip: Drag on empty table space to box-select rows.
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
          {newProductHref ? (
            <Link
              href={newProductHref}
              className={cn(buttonVariants(), "shrink-0")}
            >
              New Product
            </Link>
          ) : null}
        </div>
      ) : null}
      <div ref={tableWrapRef} className="relative rounded-md border">
        <Table
          onMouseDown={(event) => {
            if (
              !enableDragSelect ||
              event.button !== 0 ||
              !tableWrapRef.current
            )
              return;
            const target = event.target as HTMLElement;
            if (
              target.closest("button") ||
              target.closest("a") ||
              target.closest("[role=checkbox]")
            ) {
              return;
            }
            setDrag({
              startX: event.clientX,
              startY: event.clientY,
              currentX: event.clientX,
              currentY: event.clientY,
              additive: event.ctrlKey || event.metaKey,
              startSelection: rowSelection,
            });
          }}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  ref={(node) => {
                    rowRefs.current[row.id] = node;
                  }}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {emptyResultsMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {dragOverlayStyle ? (
          <div
            className="pointer-events-none absolute z-20 border border-primary/70 bg-primary/15"
            style={dragOverlayStyle}
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 text-sm text-muted-foreground">
          {selectedIds.length} of {filteredCount} row(s) selected.
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Rows per page</span>
            <Select value={String(pageSize)} onValueChange={changePageSize}>
              <SelectTrigger className="h-8 w-[72px]">
                <SelectValue placeholder={String(pageSize)} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-8 px-2"
              disabled={page <= 1}
              onClick={() =>
                pushQueryParams({ page: String(Math.max(1, page - 1)) })
              }
            >
              Prev
            </Button>
            <span className="text-sm font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              className="h-8 px-2"
              disabled={page >= totalPages}
              onClick={() =>
                pushQueryParams({
                  page: String(Math.min(totalPages, page + 1)),
                })
              }
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
