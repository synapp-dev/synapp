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
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { cn } from "@workspace/ui/lib/utils";
import type { classes } from "@/server/db/schema";

type Class = typeof classes.$inferSelect;
type ClassWithYearCodes = Class & {
  yearCodes?: string[] | null;
  yearNames?: string[] | null;
};

function ordinalSuffix(day: number): string {
  const d = day % 100;
  if (d >= 11 && d <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatClassCreatedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.getDate();
  const month = d.toLocaleDateString("en-AU", { month: "long" });
  const year = d.getFullYear();
  return `${day}${ordinalSuffix(day)} ${month} ${year}`;
}

interface ClassesTableProps {
  classes: ClassWithYearCodes[];
  isLoading?: boolean;
  error?: string | null;
  onClassClick?: (classItem: ClassWithYearCodes) => void;
  onRowSelectionChange?: (selection: Record<string, boolean>) => void;
  showSelection?: boolean;
  /** When true, table grows with flex parent and only the body area scrolls (header stays fixed). */
  fillHeight?: boolean;
}

/** Width + horizontal padding for select / status / name columns */
function columnLayoutClass(columnId: string): string | undefined {
  switch (columnId) {
    case "select":
      return "w-11 min-w-11 max-w-11 px-2.5";
    case "active":
      /* pl-3 keeps space after checkbox; tighter pr pulls class name closer */
      return "min-w-[2rem] max-w-[3rem] pl-3 pr-1.5";
    case "name":
      return "pl-0";
    default:
      return undefined;
  }
}

const columns: ColumnDef<ClassWithYearCodes>[] = [
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => {
      const active = row.getValue("active") as boolean;
      return (
        <Badge
          variant={active ? "default" : "secondary"}
          className={cn(
            "border-0 font-normal",
            active &&
              "bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]"
          )}
        >
          {active ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "name",
    header: "Class Name",
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue("name")}</div>;
    },
  },
  {
    id: "yearLevels",
    header: "Year Levels",
    accessorFn: (row) => {
      const names = row.yearNames?.filter(Boolean) ?? [];
      if (names.length > 0) return names.join(" ");
      return (row.yearCodes ?? []).join(" ");
    },
    cell: ({ row }) => {
      const original = row.original;
      const names = original.yearNames?.filter(Boolean) ?? [];
      const labels =
        names.length > 0 ? names : (original.yearCodes ?? []).filter(Boolean);
      if (labels.length > 0) {
        return (
          <div className="flex flex-wrap gap-1">
            {labels.map((label, index) => (
              <Badge
                key={`${label}-${index}`}
                variant="secondary"
                className="border-0 bg-muted text-xs font-normal text-primary"
              >
                {label}
              </Badge>
            ))}
          </div>
        );
      }
      return <span className="text-sm text-muted-foreground">—</span>;
    },
  },
  {
    accessorKey: "startYear",
    header: "Running Year",
    cell: ({ row }) => {
      const startYear = row.getValue("startYear") as string | null;
      if (startYear) {
        const year = new Date(startYear).getFullYear();
        return (
          <span className="text-sm text-muted-foreground">{year}</span>
        );
      }
      return <span className="text-sm text-muted-foreground">—</span>;
    },
  },
  {
    accessorKey: "studentCap",
    header: "Class Size",
    cell: ({ row }) => {
      const cap = row.getValue("studentCap") as number | null | undefined;
      if (cap != null && cap !== undefined && !Number.isNaN(Number(cap))) {
        return (
          <span className="text-sm text-muted-foreground tabular-nums">{Number(cap)}</span>
        );
      }
      return <span className="text-sm text-muted-foreground">—</span>;
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const createdAt = row.getValue("createdAt") as string | null;
      if (createdAt) {
        return (
          <span className="text-sm text-muted-foreground">
            {formatClassCreatedDate(createdAt)}
          </span>
        );
      }
      return <span className="text-sm text-muted-foreground">—</span>;
    },
  },
];

export function ClassesTable({
  classes,
  isLoading = false,
  error = null,
  onClassClick,
  onRowSelectionChange,
  showSelection = false,
  fillHeight = false,
}: ClassesTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const enhancedColumns = React.useMemo<ColumnDef<ClassWithYearCodes>[]>(() => {
    const selectionColumn: ColumnDef<ClassWithYearCodes> = {
      id: "select",
      header: ({ table }) => (
        <div className="flex h-full min-h-8 items-center justify-center leading-none">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex h-full min-h-8 items-center justify-center leading-none">
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

    return showSelection ? [selectionColumn, ...columns] : columns;
  }, [showSelection]);

  const table = useReactTable({
    data: classes,
    columns: enhancedColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      const newSelection =
        typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(newSelection);
      onRowSelectionChange?.(newSelection);
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 10000, // Show all rows by default
      },
    },
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-32 text-destructive">
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">Loading classes...</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-md border",
        fillHeight ? "min-h-0 flex-1" : "max-h-[600px]"
      )}
    >
      <div
        className={cn(
          fillHeight
            ? "min-h-0 flex-1 overflow-x-auto overflow-y-auto"
            : "overflow-auto"
        )}
      >
        <table className="w-full caption-bottom text-sm">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const layout = columnLayoutClass(header.column.id);
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "sticky top-0 z-10 border-b bg-background shadow-sm",
                        layout
                      )}
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
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    onClassClick && "cursor-pointer hover:bg-muted/50"
                  )}
                  onClick={() => onClassClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={columnLayoutClass(cell.column.id)}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={enhancedColumns.length}
                  className="h-24 text-center"
                >
                  No classes found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </div>
    </div>
  );
}
