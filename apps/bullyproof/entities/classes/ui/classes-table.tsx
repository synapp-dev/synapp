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
  Table,
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
type ClassWithYearCodes = Class & { yearCodes?: string[] };

interface ClassesTableProps {
  classes: ClassWithYearCodes[];
  isLoading?: boolean;
  error?: string | null;
  onClassClick?: (classItem: ClassWithYearCodes) => void;
  onRowSelectionChange?: (selection: Record<string, boolean>) => void;
  showSelection?: boolean;
}

const columns: ColumnDef<ClassWithYearCodes>[] = [
  {
    accessorKey: "name",
    header: "Class Name",
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue("name")}</div>;
    },
  },
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => {
      const code = row.getValue("code") as string | null;
      return (
        <span className="text-sm text-muted-foreground">{code || "—"}</span>
      );
    },
  },
  {
    accessorKey: "yearCodes",
    header: "Year Level Codes",
    cell: ({ row }) => {
      const yearCodes = row.getValue("yearCodes") as string[] | undefined;
      if (yearCodes && yearCodes.length > 0) {
        return (
          <div className="flex flex-wrap gap-1">
            {yearCodes.map((yearCode, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {yearCode}
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
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => {
      const active = row.getValue("active") as boolean;
      return (
        <Badge variant={active ? "default" : "secondary"}>
          {active ? "Active" : "Inactive"}
        </Badge>
      );
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
            {new Date(createdAt).toLocaleDateString()}
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
        <div className="pl-2">
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
        <div className="pl-2">
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
    <div className="rounded-md border overflow-hidden flex flex-col max-h-[600px]">
      <div className="overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="bg-background">
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
                    <TableCell key={cell.id}>
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
        </Table>
      </div>
    </div>
  );
}
