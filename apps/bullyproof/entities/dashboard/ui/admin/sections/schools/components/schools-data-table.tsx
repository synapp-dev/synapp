"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";

// Extend ColumnMeta to include align property.
// TData/TValue are required to match the original interface for declaration
// merging (TS2428), so they are intentionally unused here.
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: "left" | "right" | "center";
  }
}

import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { cn } from "@workspace/ui/lib/utils";

import { columns, type School } from "./schools-table-columns";

interface SchoolsDataTableProps {
  onSchoolClick: (school: School) => void;
  refreshTrigger?: number | string; // When this changes, the table will refetch data
  schools: School[];
  isLoading?: boolean;
  error?: string | null;
  onRowSelectionChange?: (selection: Record<string, boolean>) => void;
}

export function SchoolsDataTable({
  onSchoolClick,
  schools,
  isLoading = false,
  error = null,
  onRowSelectionChange,
}: SchoolsDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // Enhanced columns with selection column
  const enhancedColumns = React.useMemo<ColumnDef<School>[]>(() => {
    const selectionColumn: ColumnDef<School> = {
      id: "select",
      header: ({ table }) => {
        const isAllSelected = table.getIsAllPageRowsSelected();
        const isSomeSelected = table.getIsSomePageRowsSelected();
        return (
          <div className="pl-1 pr-1">
            <Checkbox
              checked={
                isAllSelected ? true : isSomeSelected ? "indeterminate" : false
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
              aria-label="Select all"
            />
          </div>
        );
      },
      cell: ({ row }) => (
        <div className="pl-1 pr-1">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    };

    return [selectionColumn, ...columns];
  }, []);

  const data = schools;

  const table = useReactTable({
    data,
    columns: enhancedColumns,
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      const newSelection =
        typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(newSelection);
      onRowSelectionChange?.(newSelection);
    },
    initialState: {
      pagination: {
        pageSize: 10000,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  // Inject styles client-side only to avoid hydration errors
  React.useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      [data-slot="scroll-area-viewport"] {
        overflow-y: scroll !important;
        -ms-overflow-style: none !important;
        scrollbar-width: none !important;
      }
      [data-slot="scroll-area-viewport"]::-webkit-scrollbar {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="rounded-md border flex flex-col overflow-hidden flex-1 min-h-0">
        <div className="flex-shrink-0 border-b overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="w-full table-fixed">
              <colgroup>
                {table.getHeaderGroups()[0]?.headers.map((header) => {
                  let width = "auto";
                  const columnId = header.column.id;
                  if (columnId === "select") {
                    width = "28px";
                  } else if (columnId === "status") {
                    width = "12%";
                  } else if (columnId === "name") {
                    width = "28%";
                  } else if (columnId === "levels") {
                    width = "12%";
                  } else if (columnId === "state") {
                    width = "10%";
                  } else if (columnId === "sector") {
                    width = "12%";
                  } else if (columnId === "staffCount") {
                    width = "10%";
                  } else if (columnId === "teacherCount" || columnId === "classCount") {
                    width = "10%";
                  }
                  return <col key={header.id} style={{ width }} />;
                })}
              </colgroup>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const align = header.column.columnDef.meta?.align;
                      return (
                        <TableHead
                          key={header.id}
                          className={
                            align === "right"
                              ? "text-right"
                              : align === "center"
                                ? "text-center"
                                : "text-left"
                          }
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
            </Table>
          </div>
        </div>
        <div className="flex-1 h-full relative">
          <ScrollArea className="h-full w-full">
            <div className="pb-3">
              <Table className="w-full table-fixed">
                <colgroup>
                  {table.getHeaderGroups()[0]?.headers.map((header) => {
                    let width = "auto";
                    const columnId = header.column.id;
                    if (columnId === "select") {
                      width = "32px";
                    } else if (columnId === "status") {
                      width = "12%";
                    } else if (columnId === "name") {
                      width = "28%";
                    } else if (columnId === "levels") {
                      width = "12%";
                    } else if (columnId === "state") {
                      width = "10%";
                    } else if (columnId === "sector") {
                      width = "14%";
                    } else if (columnId === "teacherCount" || columnId === "classCount") {
                      width = "10%";
                    }
                    return <col key={header.id} style={{ width }} />;
                  })}
                </colgroup>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={enhancedColumns.length}
                        className="h-24 text-center"
                      >
                        Loading schools...
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell
                        colSpan={enhancedColumns.length}
                        className="h-24 text-center text-destructive"
                      >
                        Error: {error}
                      </TableCell>
                    </TableRow>
                  ) : table.getRowModel().rows?.length ? (
                    <>
                      {table.getRowModel().rows.map((row, index) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                          className="cursor-pointer hover:bg-muted/50 opacity-0 animate-slide-up-fade-in"
                          style={{
                            animationDelay: `${index * 0.03}s`,
                            animationFillMode: "forwards",
                          }}
                          onClick={() => {
                            const hasSelectedRows = Object.keys(
                              rowSelection
                            ).some((key) => rowSelection[key]);
                            if (hasSelectedRows) {
                              row.toggleSelected();
                            } else {
                              onSchoolClick(row.original);
                            }
                          }}
                        >
                          {row.getVisibleCells().map((cell) => {
                            const align = cell.column.columnDef.meta?.align;
                            const isSelectCell = cell.column.id === "select";
                            return (
                              <TableCell
                                key={cell.id}
                                className={cn(
                                  align === "right"
                                    ? "text-right"
                                    : align === "center"
                                      ? "text-center"
                                      : "text-left",
                                  "px-2 py-2"
                                )}
                                onClick={
                                  isSelectCell
                                    ? (e) => e.stopPropagation()
                                    : undefined
                                }
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                      {/* Spacer row to ensure last row is fully visible */}
                      <TableRow className="h-8 pointer-events-none">
                        <TableCell
                          colSpan={enhancedColumns.length}
                          className="p-0"
                        />
                      </TableRow>
                    </>
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={enhancedColumns.length}
                        className="h-24 text-center"
                      >
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
