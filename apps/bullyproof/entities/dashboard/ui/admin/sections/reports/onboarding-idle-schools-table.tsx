"use client";

import * as React from "react";
import Link from "next/link";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import type { AdminReportsOverviewDto } from "@/entities/reports/api/endpoints";

export type IdleOnboardingRow = AdminReportsOverviewDto["idleSchools"][number];

function statusSortValue(status: IdleOnboardingRow["activationStatus"]): number {
  if (status === "active") return 2;
  if (status === "certification") return 1;
  return 0;
}

function StatusBadge({ status }: { status: IdleOnboardingRow["activationStatus"] }) {
  if (status === "active") {
    return <Badge variant="default">Active</Badge>;
  }
  if (status === "certification") {
    return (
      <Badge variant="secondary" className="border border-border">
        Certification
      </Badge>
    );
  }
  return <Badge variant="outline">Locked</Badge>;
}

export function OnboardingIdleSchoolsTable({ rows }: { rows: IdleOnboardingRow[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [selected, setSelected] = React.useState<IdleOnboardingRow | null>(null);

  const columns = React.useMemo<ColumnDef<IdleOnboardingRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="-ml-2 h-8 px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            School
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        id: "activationStatus",
        accessorFn: (row) => statusSortValue(row.activationStatus),
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="-ml-2 h-8 px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <StatusBadge status={row.original.activationStatus} />,
      },
      {
        accessorKey: "daysSinceActiveLicenceStart",
        sortingFn: (a, b, id) => {
          const av = a.getValue(id) as number | null;
          const bv = b.getValue(id) as number | null;
          const aN = av ?? -1;
          const bN = bv ?? -1;
          return aN === bN ? 0 : aN < bN ? -1 : 1;
        },
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="-ml-2 h-8 px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Days (licence start)
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const d = row.original.daysSinceActiveLicenceStart;
          return d === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="tabular-nums">{d}</span>
          );
        },
      },
      {
        accessorKey: "classCount",
        header: ({ column }) => (
          <div className="text-right">
            <Button
              variant="ghost"
              className="-mr-2 h-8 px-2"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Classes
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums">{row.original.classCount}</div>
        ),
      },
      {
        accessorKey: "teacherCount",
        header: ({ column }) => (
          <div className="text-right">
            <Button
              variant="ghost"
              className="-mr-2 h-8 px-2"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Teachers
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums">{row.original.teacherCount}</div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ id: "name", desc: false }],
    },
  });

  const adminHref = selected
    ? selected.slug
      ? `/admin/schools?school=${encodeURIComponent(selected.slug)}`
      : `/admin/schools?search=${encodeURIComponent(selected.name)}`
    : "#";

  const schoolHomeHref = selected ? `/schools/${selected.id}/home` : "#";

  return (
    <>
      <div className="max-h-[min(70vh,720px)] overflow-auto rounded-md border">
        <table className="w-full caption-bottom text-sm">
          <TableHeader className="sticky top-0 z-10 border-b bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b-0 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="bg-background">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/60",
                    selected?.id === row.original.id && "bg-muted/40"
                  )}
                  tabIndex={0}
                  role="button"
                  onClick={() => setSelected(row.original)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(row.original);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No rows.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{selected?.name ?? "School"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button asChild className="w-full">
              <Link href={adminHref}>Go to admin</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={schoolHomeHref}>Go to school home</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
