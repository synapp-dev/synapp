"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

// Extend ColumnMeta to include align property
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    align?: "left" | "right" | "center";
  }
}
import { ChevronDown, Search, X, Loader2 } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
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

import { columns, type School } from "./schools-table-columns";
import { schoolApi } from "@/entities/school/api/endpoints";

interface SchoolsDataTableProps {
  onSchoolClick: (school: School) => void;
  refreshTrigger?: number | string; // When this changes, the table will refetch data
}

export function SchoolsDataTable({
  onSchoolClick,
  refreshTrigger,
}: SchoolsDataTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [schools, setSchools] = React.useState<School[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filter states - initialize from URL params
  const [searchFilter, setSearchFilter] = React.useState(
    searchParams?.get("search") || ""
  );
  const [debouncedSearchFilter, setDebouncedSearchFilter] = React.useState(
    searchParams?.get("search") || ""
  );
  const [stateFilter, setStateFilter] = React.useState(
    searchParams?.get("state") || "all"
  );
  const [sectorFilter, setSectorFilter] = React.useState(
    searchParams?.get("sector") || "all"
  );
  const [statusFilter, setStatusFilter] = React.useState(
    searchParams?.get("status") || "all"
  );

  // Update URL query parameters
  const updateQueryParams = React.useCallback(
    (updates: {
      search?: string;
      state?: string;
      sector?: string;
      status?: string;
    }) => {
      const params = new URLSearchParams(searchParams?.toString() || "");

      if (updates.search !== undefined) {
        if (updates.search.trim()) {
          params.set("search", updates.search.trim());
        } else {
          params.delete("search");
        }
      }

      if (updates.state !== undefined) {
        if (updates.state !== "all") {
          params.set("state", updates.state);
        } else {
          params.delete("state");
        }
      }

      if (updates.sector !== undefined) {
        if (updates.sector !== "all") {
          params.set("sector", updates.sector);
        } else {
          params.delete("sector");
        }
      }

      if (updates.status !== undefined) {
        if (updates.status !== "all") {
          params.set("status", updates.status);
        } else {
          params.delete("status");
        }
      }

      const newUrl = params.toString()
        ? `/admin/schools?${params.toString()}`
        : "/admin/schools";
      router.replace(newUrl, { scroll: false });
    },
    [router, searchParams]
  );

  // Debounce search query updates (500ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchFilter(searchFilter);
      updateQueryParams({ search: searchFilter });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchFilter, updateQueryParams]);

  // Update URL immediately when filters change
  React.useEffect(() => {
    updateQueryParams({ state: stateFilter });
  }, [stateFilter, updateQueryParams]);

  React.useEffect(() => {
    updateQueryParams({ sector: sectorFilter });
  }, [sectorFilter, updateQueryParams]);

  React.useEffect(() => {
    updateQueryParams({ status: statusFilter });
  }, [statusFilter, updateQueryParams]);

  React.useEffect(() => {
    const fetchSchools = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all schools in batches (max limit is 100 per API)
        const allSchools: School[] = [];
        let offset = 0;
        const limit = 100; // Maximum allowed by API
        let hasMore = true;

        while (hasMore) {
          const result = await schoolApi.get.listSchools({
            limit,
            offset,
          });

          if (result.data === null) {
            // TypeScript knows this is ApiErr when data is null
            const errorObj = result.error as {
              message: string;
              status?: number;
            };
            setError(errorObj?.message || "Failed to fetch schools");
            break;
          }

          // Map the API response to match School type
          // Compute status based on counts from v_schools_statistics view
          const mappedSchools: School[] = result.data.map((school: any) => {
            const teacherCount = school.teacherCount ?? 0;
            const classCount = school.classCount ?? 0;
            const schoolAdminCount = school.schoolAdminCount ?? 0;
            const schoolLicenceCount = school.schoolLicenceCount ?? 0;

            // Status: onboarding if any count < 1, active if all counts >= 1
            const status: "onboarding" | "active" =
              teacherCount < 1 ||
              classCount < 1 ||
              schoolAdminCount < 1 ||
              schoolLicenceCount < 1
                ? "onboarding"
                : "active";

            return {
              id: school.id || "",
              name: school.name || "",
              state: school.state || null,
              sector: school.sector || null,
              teacherCount,
              classCount,
              schoolAdminCount,
              schoolLicenceCount,
              activeLicence: school.activeLicence ?? false,
              status,
              slug: school.slug || null,
              levels: school.levels || null,
            };
          });

          allSchools.push(...mappedSchools);

          // If we got fewer than the limit, we've fetched all schools
          if (mappedSchools.length < limit) {
            hasMore = false;
          } else {
            offset += limit;
          }
        }

        setSchools(allSchools);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch schools"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchools();
  }, [refreshTrigger]);

  // Filter schools based on filter states (use debounced search)
  const filteredSchools = React.useMemo(() => {
    return schools.filter((school) => {
      // Search filter (name) - use debounced value
      if (
        debouncedSearchFilter &&
        !school.name.toLowerCase().includes(debouncedSearchFilter.toLowerCase())
      ) {
        return false;
      }

      // State filter
      if (stateFilter !== "all" && school.state !== stateFilter) {
        return false;
      }

      // Sector filter
      if (sectorFilter !== "all" && school.sector !== sectorFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && school.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [schools, debouncedSearchFilter, stateFilter, sectorFilter, statusFilter]);

  const data = filteredSchools;

  const table = useReactTable({
    data,
    columns,
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

  // Get unique states and sectors from ALL schools for filter options
  const allUniqueStates = React.useMemo(() => {
    const states = new Set(schools.map((s) => s.state).filter(Boolean));
    return Array.from(states).sort() as string[];
  }, [schools]);

  // Get states/sectors from CURRENT filtered schools (for enabling/disabling)
  const currentAvailableStates = React.useMemo(() => {
    return new Set(filteredSchools.map((s) => s.state).filter(Boolean));
  }, [filteredSchools]);

  const currentAvailableSectors = React.useMemo(() => {
    return new Set(filteredSchools.map((s) => s.sector).filter(Boolean));
  }, [filteredSchools]);

  const currentAvailableStatuses = React.useMemo(() => {
    return new Set(filteredSchools.map((s) => s.status).filter(Boolean));
  }, [filteredSchools]);

  // All possible sectors and statuses
  const allSectors = ["government", "catholic", "independent"] as const;
  const allStatuses = ["active", "onboarding"] as const;

  // Count schools for each filter option in current filtered results
  const getStateCount = (state: string) => {
    return filteredSchools.filter((school) => school.state === state).length;
  };

  const getSectorCount = (sector: string) => {
    return filteredSchools.filter((school) => school.sector === sector).length;
  };

  const getStatusCount = (status: string) => {
    return filteredSchools.filter((school) => school.status === status).length;
  };

  return (
    <div className="w-full">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 py-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search schools..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-10 pr-10"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {searchFilter !== debouncedSearchFilter || isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : searchFilter ? (
              <button
                type="button"
                onClick={() => setSearchFilter("")}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All States" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {allUniqueStates.map((state) => {
              const isAvailable = currentAvailableStates.has(state);
              const isSelected = stateFilter === state;
              const count = getStateCount(state);
              return (
                <SelectItem
                  key={state}
                  value={state}
                  disabled={!isAvailable && !isSelected}
                  className={!isAvailable && !isSelected ? "opacity-50" : ""}
                  title={!isAvailable && !isSelected ? "No results" : undefined}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{state.toUpperCase()}</span>
                    {isAvailable && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {count}
                      </span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Sectors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sectors</SelectItem>
            {allSectors.map((sector) => {
              const isAvailable = currentAvailableSectors.has(
                sector as "government" | "catholic" | "independent"
              );
              const isSelected = sectorFilter === sector;
              const sectorName =
                sector.charAt(0).toUpperCase() + sector.slice(1);
              const count = getSectorCount(sector);
              return (
                <SelectItem
                  key={sector}
                  value={sector}
                  disabled={!isAvailable && !isSelected}
                  className={!isAvailable && !isSelected ? "opacity-50" : ""}
                  title={!isAvailable && !isSelected ? "No results" : undefined}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{sectorName}</span>
                    {isAvailable && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {count}
                      </span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {allStatuses.map((status) => {
              const isAvailable = currentAvailableStatuses.has(
                status as "active" | "onboarding"
              );
              const isSelected = statusFilter === status;
              const statusName =
                status.charAt(0).toUpperCase() + status.slice(1);
              const count = getStatusCount(status);
              return (
                <SelectItem
                  key={status}
                  value={status}
                  disabled={!isAvailable && !isSelected}
                  className={!isAvailable && !isSelected ? "opacity-50" : ""}
                  title={!isAvailable && !isSelected ? "No results" : undefined}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{statusName}</span>
                    {isAvailable && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {count}
                      </span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Loading schools...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
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
                  onClick={() => onSchoolClick(row.original)}
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
                  colSpan={columns.length}
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
