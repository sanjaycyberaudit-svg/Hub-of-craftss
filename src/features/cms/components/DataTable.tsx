"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  AdminTableSearch,
  AdminTableSearchConfig,
} from "@/components/admin/AdminTableSearch";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { filterAdminCollectionTableRows } from "@/lib/admin/table-search";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  search?: AdminTableSearchConfig;
  searchLayout?: "default" | "compact";
  toolbarEnd?: React.ReactNode;
  newItemHref?: string;
  newItemLabel?: string;
}

export default function DataTable<TData, TValue>({
  columns,
  data,
  search,
  searchLayout = "default",
  toolbarEnd,
  newItemHref,
  newItemLabel = "New",
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [draftSearch, setDraftSearch] = React.useState("");

  const filteredData = React.useMemo(() => {
    if (!search) return data;
    return filterAdminCollectionTableRows(
      data as Parameters<typeof filterAdminCollectionTableRows>[0],
      appliedSearch,
    ) as TData[];
  }, [appliedSearch, data, search]);

  const applySearch = React.useCallback(
    (value?: string) => {
      const next = (value ?? draftSearch).trim();
      setAppliedSearch(next);
      setDraftSearch(next);
    },
    [draftSearch],
  );

  const clearSearch = React.useCallback(() => {
    setAppliedSearch("");
    setDraftSearch("");
  }, []);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    autoResetPageIndex: true,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const filteredCount = filteredData.length;
  const totalCount = data.length;
  const isFiltering = appliedSearch.trim().length > 0;

  React.useEffect(() => {
    table.setPageIndex(0);
  }, [appliedSearch, table]);

  return (
    <div className="space-y-4">
      {search ? (
        <AdminTableSearch
          {...search}
          layout={searchLayout}
          appliedQuery={appliedSearch}
          draftQuery={draftSearch}
          onDraftQueryChange={setDraftSearch}
          onApplySearch={applySearch}
          onClearSearch={clearSearch}
          filteredCount={filteredCount}
          totalCount={totalCount}
          toolbarEnd={toolbarEnd}
          hasActiveFilters={searchLayout === "compact" && isFiltering}
          onClearAllFilters={
            searchLayout === "compact" ? clearSearch : undefined
          }
        />
      ) : null}
      {newItemHref ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link href={newItemHref} className={cn(buttonVariants(), "shrink-0")}>
            {newItemLabel}
          </Link>
        </div>
      ) : null}
      <div className="rounded-md border">
        <Table>
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
                  {isFiltering
                    ? `No results for "${appliedSearch.trim()}".`
                    : "No results."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {isFiltering && filteredCount === 0 ? null : (
        <DataTablePagination table={table} />
      )}
    </div>
  );
}
