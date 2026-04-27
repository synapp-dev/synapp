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
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Badge } from "@workspace/ui/components/badge";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@workspace/ui/components/pagination";
import { cn } from "@workspace/ui/lib/utils";
import { Loader2 } from "lucide-react";
import { RoleBadges } from "@/components/atoms/role-badges";
import type { roles } from "@/server/db/schema";
import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import { columns } from "@/app/(main)/admin/users/components/users-table-columns";

type Role = typeof roles.$inferSelect;
type User = UserWithRolesAndSchools;

interface UsersTableProps {
  users: User[];
  roles: Role[];
  isLoading?: boolean;
  error?: string | null;
  onUserClick?: (user: User) => void;
  onRowSelectionChange?: (selection: Record<string, boolean>) => void;
  schoolId?: string; // Optional: when provided, filters roles to this school only
  showSelection?: boolean; // Whether to show selection checkboxes
  pageIndex?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  /** When it returns true, the row cannot be bulk-selected (e.g. Intradark dev rows for non-dev admins). */
  isRowSelectionLocked?: (user: User) => boolean;
}

export function UsersTable({
  users,
  roles,
  isLoading = false,
  error = null,
  onUserClick,
  onRowSelectionChange,
  schoolId,
  showSelection = false,
  pageIndex = 0,
  pageSize = 50,
  totalCount = 0,
  onPageChange,
  onPageSizeChange,
  isRowSelectionLocked,
}: UsersTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // Enhanced columns with role rendering
  const enhancedColumns = React.useMemo<ColumnDef<User>[]>(() => {
    const selectionColumn: ColumnDef<User> = {
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
            disabled={!row.getCanSelect()}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    };

    const baseColumns = showSelection ? [selectionColumn, ...columns] : columns;

    return baseColumns.map((col) => {
      if ("accessorKey" in col && col.accessorKey === "roles") {
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

            // Add platform roles (only if not filtering by school)
            if (!schoolId) {
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
            }

            // Add school roles (filtered by schoolId if provided)
            user.schoolRoles.forEach((schoolRole) => {
              if (schoolRole.roleKey) {
                // If schoolId is provided, only include roles for that school
                if (schoolId && schoolRole.schoolId !== schoolId) {
                  return;
                }

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

            // Group school roles by schoolId (only if not filtering by school)
            const platformRoles = allRolesWithSchools.filter(
              (r) => r.isPlatform
            );
            const schoolRoles = allRolesWithSchools.filter(
              (r) => !r.isPlatform
            );

            // Group school roles by schoolId
            const rolesBySchool = new Map<
              string,
              Array<{
                name: string;
                isAdmin: boolean;
                roleKey: string;
                schoolId?: string;
                schoolName?: string;
              }>
            >();

            schoolRoles.forEach((role) => {
              const sid = role.schoolId || "unknown";
              if (!rolesBySchool.has(sid)) {
                rolesBySchool.set(sid, []);
              }
              rolesBySchool.get(sid)!.push(role);
            });

            return (
              <div className="flex flex-wrap gap-4">
                {allRolesWithSchools.length > 0 ? (
                  <>
                    {/* Render platform roles */}
                    {platformRoles.length > 0 && (
                      <RoleBadges
                        roles={platformRoles.map((r) => ({
                          roleKey: r.roleKey,
                          roleName: r.name,
                          isPlatform: true,
                        }))}
                        variant="joined"
                        size="md"
                      />
                    )}

                    {/* Render school roles grouped by school (or just roles if schoolId is provided) */}
                    {schoolId ? (
                      <RoleBadges
                        roles={schoolRoles.map((r) => ({
                          roleKey: r.roleKey,
                          roleName: r.name,
                          isPlatform: false,
                        }))}
                        variant="joined"
                        size="sm"
                      />
                    ) : (
                      Array.from(rolesBySchool.entries()).map(
                        ([sid, schoolRolesList]) => {
                          const schoolName = schoolRolesList[0]?.schoolName;
                          return (
                            <div
                              key={`school-${sid}`}
                              className="flex items-center gap-0 flex-wrap"
                            >
                              <RoleBadges
                                roles={schoolRolesList.map((r) => ({
                                  roleKey: r.roleKey,
                                  roleName: r.name,
                                  isPlatform: false,
                                }))}
                                variant="joined"
                                size="sm"
                                lastConnectsToRight={!!schoolName}
                              />
                              {schoolName && (
                                <Badge
                                  variant="outline"
                                  className="flex items-center gap-1 border-l-0 rounded-r-md rounded-l-none text-muted-foreground pl-5 -ml-2 z-0 bg-transparent pr-2 py-1"
                                >
                                  {schoolName}
                                </Badge>
                              )}
                            </div>
                          );
                        }
                      )
                    )}
                  </>
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
  }, [roles, schoolId, showSelection, isRowSelectionLocked]);

  const table = useReactTable({
    data: users,
    columns: enhancedColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      const newSelection =
        typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(newSelection);
      onRowSelectionChange?.(newSelection);
    },
    // Disable client-side pagination since we're doing server-side pagination
    manualPagination: true,
    pageCount: -1, // Unknown page count
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    enableRowSelection: isRowSelectionLocked
      ? (row) => !isRowSelectionLocked(row.original)
      : true,
  });

  // Calculate pagination info
  const isShowingAll = pageSize === -1;
  const safeTotalCount = totalCount || 0;
  const startRow = isShowingAll ? 1 : pageIndex * pageSize + 1;
  const endRow = isShowingAll 
    ? safeTotalCount 
    : Math.min(startRow + users.length - 1, safeTotalCount);
  const totalPages = isShowingAll ? 1 : Math.max(1, Math.ceil(safeTotalCount / pageSize));
  const hasNextPage = !isShowingAll && pageIndex < totalPages - 1;
  const hasPreviousPage = !isShowingAll && pageIndex > 0;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="rounded-md border flex flex-col overflow-hidden flex-1 min-h-0">
        {/* Fixed Header */}
        <div className="flex-shrink-0 border-b overflow-hidden bg-background">
          <div className="overflow-x-auto">
            <Table className="w-full table-fixed">
              <colgroup>
                {table.getHeaderGroups()[0]?.headers.map((header) => {
                  let width = "auto";
                  const columnId = header.column.id;
                  if (columnId === "select") {
                    width = "40px";
                  } else if (columnId === "name") {
                    width = "35%";
                  } else if (columnId === "roles") {
                    width = "35%";
                  } else if (columnId === "lastLoginAt") {
                    width = "15%";
                  } else if (columnId === "createdAt") {
                    width = "15%";
                  }
                  return <col key={header.id} style={{ width }} />;
                })}
              </colgroup>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
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
        
        {/* Scrollable Body */}
        <div className="flex-1 h-full relative min-h-0">
          <ScrollArea className="h-full w-full">
            <div className="pb-3">
              <Table className="w-full table-fixed">
                <colgroup>
                  {table.getHeaderGroups()[0]?.headers.map((header) => {
                    let width = "auto";
                    const columnId = header.column.id;
                    if (columnId === "select") {
                      width = "40px";
                    } else if (columnId === "name") {
                      width = "35%";
                    } else if (columnId === "roles") {
                      width = "35%";
                    } else if (columnId === "lastLoginAt") {
                      width = "15%";
                    } else if (columnId === "createdAt") {
                      width = "15%";
                    }
                    return <col key={header.id} style={{ width }} />;
                  })}
                </colgroup>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    <>
                      {table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                          className={cn(
                            onUserClick && "cursor-pointer hover:bg-muted/50"
                          )}
                          onClick={() => onUserClick?.(row.original)}
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
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
      </div>
      
      {/* Fixed Pagination Controls */}
      {(onPageChange || onPageSizeChange) && (
        <div className="flex-shrink-0 flex items-center justify-between px-2 py-4 border-t bg-background">
          {/* Left side: Info */}
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground whitespace-nowrap min-w-[140px]">
              {isLoading 
                ? "Loading..."
                : isShowingAll 
                  ? `Showing all ${safeTotalCount} users`
                  : `Showing ${users.length > 0 ? startRow : 0} to ${endRow} of ${safeTotalCount}`
              }
            </p>
          </div>
          {/* Right side: Rows per page and Pagination controls */}
          <div className="flex items-center gap-4">
            {onPageSizeChange && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
                <Select
                  value={pageSize === -1 ? "all" : pageSize.toString()}
                  onValueChange={(value) => {
                    if (value === "all") {
                      onPageSizeChange(-1);
                    } else {
                      onPageSizeChange(parseInt(value, 10));
                    }
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-8 w-[80px]" disabled={isLoading}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Pagination controls */}
            {onPageChange && pageSize !== -1 && (
              <Pagination className="!mx-0 !w-auto !justify-end">
                <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (!isLoading && hasPreviousPage) {
                        onPageChange(pageIndex - 1);
                      }
                    }}
                    className={cn(
                      (isLoading || !hasPreviousPage) && "pointer-events-none opacity-50"
                    )}
                    aria-disabled={isLoading || !hasPreviousPage}
                  />
                </PaginationItem>
                {/* Show first page if not near it */}
                {pageIndex > 2 && (
                  <>
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (!isLoading) {
                            onPageChange(0);
                          }
                        }}
                        className={cn(
                          isLoading && "pointer-events-none opacity-50"
                        )}
                        aria-disabled={isLoading}
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>
                    {pageIndex > 3 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                  </>
                )}
                {/* Show previous page if not first */}
                {pageIndex > 0 && (
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (!isLoading) {
                          onPageChange(pageIndex - 1);
                        }
                      }}
                      className={cn(
                        isLoading && "pointer-events-none opacity-50"
                      )}
                      aria-disabled={isLoading}
                    >
                      {pageIndex}
                    </PaginationLink>
                  </PaginationItem>
                )}
                {/* Current page */}
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    isActive
                    className={cn(
                      isLoading && "pointer-events-none opacity-50"
                    )}
                  >
                    {pageIndex + 1}
                  </PaginationLink>
                </PaginationItem>
                {/* Show next page if available */}
                {hasNextPage && pageIndex + 1 < totalPages - 1 && (
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (!isLoading) {
                          onPageChange(pageIndex + 1);
                        }
                      }}
                      className={cn(
                        isLoading && "pointer-events-none opacity-50"
                      )}
                      aria-disabled={isLoading}
                    >
                      {pageIndex + 2}
                    </PaginationLink>
                  </PaginationItem>
                )}
                {/* Show ellipsis if there are more pages before last */}
                {pageIndex + 1 < totalPages - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                {/* Show last page if not already shown */}
                {totalPages > 1 && pageIndex + 1 < totalPages - 1 && (
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (!isLoading) {
                          onPageChange(totalPages - 1);
                        }
                      }}
                      className={cn(
                        isLoading && "pointer-events-none opacity-50"
                      )}
                      aria-disabled={isLoading}
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (!isLoading && hasNextPage) {
                        onPageChange(pageIndex + 1);
                      }
                    }}
                    className={cn(
                      (isLoading || !hasNextPage) && "pointer-events-none opacity-50"
                    )}
                    aria-disabled={isLoading || !hasNextPage}
                  />
                </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
