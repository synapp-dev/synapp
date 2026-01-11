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
import { cn } from "@workspace/ui/lib/utils";
import { ShieldCheck, Users as UsersIcon, FileBadge2 } from "lucide-react";
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
  onRowSelectionChange?: (selection: Record<string, boolean>) => void;
}

export function UsersDataTable({
  onUserClick,
  refreshTrigger,
  users,
  roles,
  isLoading = false,
  error = null,
  onRowSelectionChange,
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
    const selectionColumn: ColumnDef<User> = {
      id: "select",
      header: ({ table }) => {
        const isAllSelected = table.getIsAllPageRowsSelected();
        const isSomeSelected = table.getIsSomePageRowsSelected();
        return (
          <div className="pl-4">
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
        <div className="pl-4">
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

    return [
      selectionColumn,
      ...columns.map((col) => {
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

              // Group school roles by schoolId
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
                const schoolId = role.schoolId || "unknown";
                if (!rolesBySchool.has(schoolId)) {
                  rolesBySchool.set(schoolId, []);
                }
                rolesBySchool.get(schoolId)!.push(role);
              });

              const getBadgeClasses = (
                roleKey: string,
                isPlatform: boolean
              ) => {
                if (roleKey === "TEACHER") {
                  return "bg-[var(--role-teacher)] text-[var(--role-teacher-text)] border-[var(--role-teacher)]/50";
                } else if (isPlatform && roleKey === "PLATFORM_ADMIN") {
                  return "bg-[var(--role-platform-admin)] text-[var(--role-platform-admin-text)] border-[var(--role-platform-admin)]/50";
                } else if (!isPlatform && roleKey === "SCHOOL_ADMIN") {
                  return "bg-[var(--role-school-admin)] text-[var(--role-school-admin-text)] border-[var(--role-school-admin)]/50";
                } else if (roleKey === "SCHOOL_STAFF") {
                  return "bg-[var(--role-school-staff)] text-[var(--role-school-staff-text)] border-[var(--role-school-staff)]/50";
                } else if (roleKey === "SCHOOL_LICENCE") {
                  return "bg-[var(--role-school-licence)] text-[var(--role-school-licence-text)] border-[var(--role-school-licence)]/50";
                }
                return "";
              };

              return (
                <div className="flex flex-wrap gap-4">
                  {allRolesWithSchools.length > 0 ? (
                    <>
                      {/* Render platform roles */}
                      {platformRoles.length > 0 && (
                        <div className="flex items-center gap-0 flex-wrap">
                          {platformRoles.map((role, idx) => {
                            const badgeClasses = getBadgeClasses(
                              role.roleKey,
                              true
                            );
                            const isFirst = idx === 0;
                            const isLast = idx === platformRoles.length - 1;
                            const roleCount = platformRoles.length;

                            // Determine border radius classes
                            let borderRadiusClass = "";
                            if (roleCount === 1) {
                              borderRadiusClass = "rounded-md";
                            } else if (isFirst) {
                              borderRadiusClass = "rounded-l-md rounded-r-none";
                            } else if (isLast) {
                              borderRadiusClass = "rounded-r-md rounded-l-none";
                            } else {
                              borderRadiusClass = "rounded-none";
                            }

                            return (
                              <Badge
                                key={`platform-${idx}`}
                                variant="default"
                                className={cn(
                                  "flex items-center gap-1 z-10 border px-2 py-1",
                                  badgeClasses,
                                  !isLast && "border-r-0 -mr-[1px]",
                                  borderRadiusClass
                                )}
                              >
                                {role.roleKey === "SCHOOL_LICENCE" ? (
                                  <FileBadge2 className="h-4 w-4" />
                                ) : role.isAdmin ? (
                                  <ShieldCheck className="h-4 w-4" />
                                ) : (
                                  <UsersIcon className="h-4 w-4" />
                                )}
                                {role.name}
                              </Badge>
                            );
                          })}
                        </div>
                      )}

                      {/* Render school roles grouped by school */}
                      {Array.from(rolesBySchool.entries()).map(
                        ([schoolId, roles], schoolIdx) => {
                          const schoolName = roles[0]?.schoolName;

                          // Sort roles in order: SCHOOL_STAFF, SCHOOL_ADMIN, TEACHER (or any teacher variant)
                          const sortedRoles = [...roles].sort((a, b) => {
                            const getRolePriority = (
                              roleKey: string
                            ): number => {
                              if (roleKey === "SCHOOL_STAFF") return 1;
                              if (roleKey === "SCHOOL_ADMIN") return 2;
                              if (
                                roleKey === "TEACHER" ||
                                roleKey.includes("TEACHER")
                              )
                                return 3;
                              // Any other roles come after
                              return 4;
                            };

                            const aPriority = getRolePriority(a.roleKey);
                            const bPriority = getRolePriority(b.roleKey);

                            return aPriority - bPriority;
                          });

                          const roleCount = sortedRoles.length;

                          return (
                            <div
                              key={`school-${schoolId}`}
                              className="flex items-center gap-0 flex-wrap"
                            >
                              {sortedRoles.map((role, roleIdx) => {
                                const badgeClasses = getBadgeClasses(
                                  role.roleKey,
                                  false
                                );
                                const isFirst = roleIdx === 0;
                                const isLast = roleIdx === roleCount - 1;

                                // Determine border radius classes
                                // Last role badge should always have rounding on the right
                                let borderRadiusClass = "";
                                if (roleCount === 1) {
                                  borderRadiusClass = schoolName
                                    ? "rounded-l-md rounded-r-md"
                                    : "rounded-md";
                                } else if (isFirst) {
                                  borderRadiusClass =
                                    "rounded-l-md rounded-r-none";
                                } else if (isLast) {
                                  // Last role badge always has rounding on the right
                                  borderRadiusClass =
                                    "rounded-r-md rounded-l-none";
                                } else {
                                  borderRadiusClass = "rounded-none";
                                }

                                return (
                                  <Badge
                                    key={`${schoolId}-${roleIdx}`}
                                    variant="default"
                                    className={cn(
                                      "flex items-center gap-1 z-10 border px-2 py-1",
                                      badgeClasses,
                                      (!isLast || schoolName) &&
                                        "border-r-0 -mr-[1px]",
                                      borderRadiusClass
                                    )}
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
                                );
                              })}
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
      }),
    ];
  }, [roles]);

  const data = users;

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
                    width = "48px";
                  } else if (columnId === "name") {
                    width = "25%";
                  } else if (columnId === "roles") {
                    width = "60%";
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
                      width = "48px";
                    } else if (columnId === "name") {
                      width = "25%";
                    } else if (columnId === "roles") {
                      width = "60%";
                    } else if (columnId === "createdAt") {
                      width = "15%";
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
                              onUserClick(row.original);
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
