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
import { ChevronDown } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { ShieldCheck, Users as UsersIcon, FileBadge2 } from "lucide-react";
import { rolesApi } from "@/entities/roles/api/endpoints";
import type { roles } from "@/server/db/schema";
import { columns, type User } from "./users-table-columns";

type Role = typeof roles.$inferSelect;

interface UsersDataTableProps {
  onUserClick: (user: User) => void;
  refreshTrigger?: number | string;
  users: User[];
  roles: Role[];
  isLoading?: boolean;
  error?: string | null;
}

export function UsersDataTable({
  onUserClick,
  refreshTrigger,
  users,
  roles,
  isLoading = false,
  error = null,
}: UsersDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // Enhanced columns with role rendering
  const enhancedColumns = React.useMemo<ColumnDef<User>[]>(() => {
    return columns.map((col) => {
      if (col.accessorKey === "roles") {
        return {
          ...col,
          cell: ({ row }) => {
            const user = row.original;
            const allRolesWithSchools: Array<{
              name: string;
              isAdmin: boolean;
              isPlatform: boolean;
              roleKey: string;
              schoolId?: string;
              schoolName?: string;
            }> = [];

            // Add platform roles
            user.platformRoles.forEach((roleKey) => {
              const role = roles.find((r) => r.key === roleKey);
              const roleName = role?.name || roleKey;
              const isAdmin =
                roleKey.includes("ADMIN") || roleKey.includes("admin");
              allRolesWithSchools.push({
                name: roleName,
                isAdmin,
                isPlatform: true,
                roleKey,
              });
            });

            // Add school roles
            user.schoolRoles.forEach((schoolRole) => {
              if (schoolRole.roleKey) {
                const roleName = schoolRole.roleName || schoolRole.roleKey;
                const isAdmin =
                  schoolRole.roleKey.includes("ADMIN") ||
                  schoolRole.roleKey.includes("admin");
                allRolesWithSchools.push({
                  name: roleName,
                  isAdmin,
                  isPlatform: false,
                  roleKey: schoolRole.roleKey,
                  schoolId: schoolRole.schoolId,
                  schoolName: schoolRole.schoolName || undefined,
                });
              }
            });

            return (
              <div className="flex flex-wrap gap-4">
                {allRolesWithSchools.length > 0 ? (
                  allRolesWithSchools.map((role, idx) => {
                    let badgeStyle: {
                      backgroundColor?: string;
                      color?: string;
                    } = {};
                    if (role.roleKey === "TEACHER") {
                      badgeStyle = {
                        backgroundColor: "#048393",
                        color: "white",
                      };
                    } else if (
                      role.isPlatform &&
                      role.roleKey === "PLATFORM_ADMIN"
                    ) {
                      badgeStyle = {
                        backgroundColor: "#ff7f00",
                        color: "white",
                      };
                    } else if (
                      !role.isPlatform &&
                      role.roleKey === "SCHOOL_ADMIN"
                    ) {
                      badgeStyle = {
                        backgroundColor: "blue",
                        color: "white",
                      };
                    } else if (role.roleKey === "SCHOOL_LICENCE") {
                      badgeStyle = {
                        backgroundColor: "#6b7280",
                        color: "white",
                      };
                    }

                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-0 flex-wrap"
                      >
                        <Badge
                          variant="default"
                          className="flex items-center gap-1 z-10"
                          style={badgeStyle}
                        >
                          {role.roleKey === "SCHOOL_LICENCE" ? (
                            <FileBadge2 className="h-3 w-3" />
                          ) : role.isAdmin ? (
                            <ShieldCheck className="h-3 w-3" />
                          ) : (
                            <UsersIcon className="h-3 w-3" />
                          )}
                          {role.name}
                        </Badge>
                        {role.schoolName && (
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 border-l-0 rounded-r-md rounded-l-none bg-muted text-muted-foreground pl-4 -ml-2 z-0"
                          >
                            {role.schoolName}
                          </Badge>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <span className="text-sm text-muted-foreground">None</span>
                )}
              </div>
            );
          },
        };
      }
      return col;
    });
  }, [roles]);

  const data = users;

  const table = useReactTable({
    data,
    columns: enhancedColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="w-full">
      <div className="rounded-md border">
        <Table>
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
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={enhancedColumns.length}
                  className="h-24 text-center"
                >
                  Loading users...
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
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onUserClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const align = cell.column.columnDef.meta?.align;
                    return (
                      <TableCell
                        key={cell.id}
                        className={
                          align === "right"
                            ? "text-right"
                            : align === "center"
                              ? "text-center"
                              : "text-left"
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
              ))
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
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              {"<<"}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              {"<"}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              {">"}
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              {">>"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
