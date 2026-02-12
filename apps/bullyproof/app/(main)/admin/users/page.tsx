"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import { useUsers, useAllUsers, useRoles } from "@/entities/users/model/store";

import { usePageTitle } from "@/hooks/use-page-title";
import { cn } from "@workspace/ui/lib/utils";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Search,
  Loader2,
  AlertCircle,
  CircleX,
  UserPlus,
  Mail,
  Trash2,
  Check,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { UserDetailDrawer } from "./components/user-detail-drawer";
import { UsersTable } from "@/entities/users/ui/users-table";
import { AddUserSheet } from "./components/add-user-sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { apiFetch } from "@/lib/api/fetcher.client";
import { meApi } from "@/entities/me/api/endpoints";

function AdminUsersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Initialize search query from URL, but don't re-initialize on every URL change
  const [searchQuery, setSearchQuery] = useState(() => 
    searchParams?.get("search") || ""
  );
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(() =>
    searchParams?.get("search") || ""
  );
  const [selectedUser, setSelectedUser] =
    useState<UserWithRolesAndSchools | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] =
    useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Get filters from URL query params
  const roleFilter = searchParams?.get("role") || "";
  const schoolFilter = searchParams?.get("schoolId") || "";
  const userIdFromUrl = searchParams?.get("id") || null;
  const isAddUserDialogOpen = searchParams?.get("dialog") === "add-new-user";
  
  // Pagination state from URL params
  const pageSizeParam = searchParams?.get("pageSize") || "50";
  const pageSize = pageSizeParam === "all" ? -1 : (() => {
    const parsed = parseInt(pageSizeParam, 10);
    return parsed >= 1 && parsed <= 100 ? parsed : 50;
  })();
  const pageIndexParam = parseInt(searchParams?.get("page") || "0", 10);
  const pageIndex = pageIndexParam >= 0 ? pageIndexParam : 0;
  const offset = pageSize === -1 ? 0 : pageIndex * pageSize;

  // Use React Query hooks for data fetching with filters
  const {
    users,
    totalCount,
    isLoading: isLoadingUsers,
    error: queryError,
    refetch: refetchUsers,
  } = useUsers({
    search: debouncedSearchQuery || undefined,
    role: roleFilter || undefined,
    schoolId: schoolFilter || undefined,
    limit: pageSize,
    offset: offset,
  });

  const {
    allUsers,
    isLoading: isLoadingAllUsers,
    refetch: refetchAllUsers,
  } = useAllUsers();

  const {
    roles,
    isLoading: isLoadingRoles,
    refetch: refetchRoles,
  } = useRoles();

  // Trigger background refetch on mount to ensure complete data
  useEffect(() => {
    refetchUsers();
    refetchAllUsers();
    refetchRoles();
  }, [refetchUsers, refetchAllUsers, refetchRoles]);

  const error = queryError?.message || null;
  const loading = isLoadingUsers || isLoadingAllUsers || isLoadingRoles;

  // Handle drawer state from URL
  useEffect(() => {
    if (userIdFromUrl && users.length > 0) {
      const user = users.find((u) => u.id === userIdFromUrl);
      if (user) {
        setSelectedUser(user);
        setIsDrawerOpen(true);
      }
    } else if (!userIdFromUrl) {
      setIsDrawerOpen(false);
      setSelectedUser(null);
    }
  }, [userIdFromUrl, users]);

  const handleUserClick = (user: UserWithRolesAndSchools) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("id", user.id);
    router.push(`/admin/users?${params.toString()}`, { scroll: false });
  };

  const handleDrawerClose = (open: boolean) => {
    setIsDrawerOpen(open);
    if (!open) {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.delete("id");
      params.delete("tab");
      params.delete("historyTab");
      router.push(`/admin/users?${params.toString()}`, { scroll: false });
      setSelectedUser(null);
    }
  };

  const handleOpenExistingUser = async (userId: string) => {
    const result = await meApi.get.userById(userId);
    if (result.data) {
      const raw = result.data;
      // Parse platformRoles (view may return string or array)
      let platformRoles: string[] = [];
      if (Array.isArray(raw.platformRoles)) {
        platformRoles = raw.platformRoles;
      } else if (typeof raw.platformRoles === "string") {
        try {
          platformRoles = JSON.parse(raw.platformRoles);
        } catch {
          platformRoles = raw.platformRoles
            .replace(/[{}"]/g, "")
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean);
        }
      }
      // Parse schoolRoles (view may return JSON string or array)
      let schoolRoles: Array<{
        schoolId: string;
        schoolName: string | null;
        roleKey: string | null;
        roleName: string | null;
      }> = [];
      if (raw.schoolRoles) {
        if (typeof raw.schoolRoles === "string") {
          try {
            const parsed = JSON.parse(raw.schoolRoles);
            schoolRoles = Array.isArray(parsed) ? parsed : [];
          } catch {
            schoolRoles = [];
          }
        } else if (Array.isArray(raw.schoolRoles)) {
          schoolRoles = raw.schoolRoles.map((sr: Record<string, unknown>) => ({
            schoolId: String(sr.schoolId ?? ""),
            schoolName: sr.schoolName != null ? String(sr.schoolName) : null,
            roleKey: sr.roleKey != null ? String(sr.roleKey) : null,
            roleName: sr.roleName != null ? String(sr.roleName) : null,
          }));
        }
      }
      const user: UserWithRolesAndSchools = {
        id: raw.id,
        firstName: raw.firstName,
        lastName: raw.lastName,
        email: raw.email,
        avatarUrl: raw.avatarUrl,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        metadata: raw.metadata,
        platformRoles,
        schoolRoles,
        lastLoginAt: null,
      };
      setSelectedUser(user);
      setIsDrawerOpen(true);
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("id", userId);
      params.delete("dialog");
      router.push(`/admin/users?${params.toString()}`, { scroll: false });
    }
  };

  // Extract unique schools from ALL users data (for filter options)
  const allAvailableSchools = Array.from(
    new Map(
      allUsers
        .flatMap((user) => user.schoolRoles)
        .filter((sr) => sr.schoolId && sr.schoolName)
        .map((sr) => [sr.schoolId, { id: sr.schoolId, name: sr.schoolName! }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Extract schools from CURRENT filtered users (for enabling/disabling)
  const currentAvailableSchools = Array.from(
    new Map<string, { id: string; name: string }>(
      users
        .flatMap((user) => user.schoolRoles)
        .filter((sr) => sr.schoolId && sr.schoolName)
        .map((sr) => [sr.schoolId, { id: sr.schoolId, name: sr.schoolName! }] as [string, { id: string; name: string }])
    ).values()
  );

  const currentAvailableSchoolIds = new Set<string>(
    currentAvailableSchools.map((s) => s.id)
  );

  // Filter roles to only show roles that have a key (for filtering)
  const availableRoles = roles
    .filter((role) => role.key)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  // Get roles that appear in current filtered users
  const currentAvailableRoleKeys = new Set(
    users.flatMap((user) => [
      ...user.platformRoles,
      ...user.schoolRoles.map((sr) => sr.roleKey).filter(Boolean),
    ])
  );

  // Count users for each role in current filtered results
  const getRoleCount = (roleKey: string) => {
    return users.filter((user) => {
      return (
        user.platformRoles.includes(roleKey) ||
        user.schoolRoles.some((sr) => sr.roleKey === roleKey)
      );
    }).length;
  };

  // Count users for each school in current filtered results
  const getSchoolCount = (schoolId: string) => {
    return users.filter((user) =>
      user.schoolRoles.some((sr) => sr.schoolId === schoolId)
    ).length;
  };

  // Track previous search value to detect actual changes
  const prevSearchQueryRef = React.useRef<string>(searchQuery);
  
  // Sync searchQuery from URL when it changes externally (e.g., browser back/forward)
  // But only if it's different from current state to avoid loops
  const urlSearch = searchParams?.get("search") || "";
  useEffect(() => {
    if (urlSearch !== searchQuery && urlSearch !== debouncedSearchQuery) {
      setSearchQuery(urlSearch);
      setDebouncedSearchQuery(urlSearch);
      prevSearchQueryRef.current = urlSearch;
    }
  }, [urlSearch]);

  // Debounce search query updates (500ms)
  // Only runs when user types in the search box, not when URL changes from pagination
  useEffect(() => {
    // Skip if searchQuery hasn't actually changed (avoid unnecessary updates)
    if (prevSearchQueryRef.current === searchQuery) {
      return;
    }
    
    const timer = setTimeout(() => {
      prevSearchQueryRef.current = searchQuery;
      setDebouncedSearchQuery(searchQuery);
      // Get fresh searchParams at execution time to preserve current URL state
      const currentParams = new URLSearchParams(window.location.search);
      
      if (searchQuery.trim()) {
        currentParams.set("search", searchQuery.trim());
      } else {
        currentParams.delete("search");
      }
      
      // Reset to page 0 when search changes (user typed something new)
      currentParams.set("page", "0");
      router.replace(`/admin/users?${currentParams.toString()}`, { scroll: false });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, router]);

  const handleRoleFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (value && value !== "all") {
      params.set("role", value);
    } else {
      params.delete("role");
    }
    // Reset to page 0 when filters change
    params.set("page", "0");
    router.push(`/admin/users?${params.toString()}`, { scroll: false });
  };

  const handleSchoolFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (value && value !== "all") {
      params.set("schoolId", value);
    } else {
      params.delete("schoolId");
    }
    // Reset to page 0 when filters change
    params.set("page", "0");
    router.push(`/admin/users?${params.toString()}`, { scroll: false });
  };
  
  const handlePageChange = (newPageIndex: number) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("page", newPageIndex.toString());
    router.push(`/admin/users?${params.toString()}`, { scroll: false });
  };
  
  const handlePageSizeChange = (newPageSize: number) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (newPageSize === -1) {
      params.set("pageSize", "all");
      params.delete("page"); // Remove page param when showing all
    } else {
      params.set("pageSize", newPageSize.toString());
      params.set("page", "0"); // Reset to first page when page size changes
    }
    router.push(`/admin/users?${params.toString()}`, { scroll: false });
  };

  const hasActiveFilters =
    debouncedSearchQuery.trim() !== "" ||
    roleFilter !== "" ||
    schoolFilter !== "";

  const clearFilters = () => {
    setSearchQuery("");
    setDebouncedSearchQuery(""); // Immediately clear debounced query to trigger refetch
    const params = new URLSearchParams();
    // Preserve pagination params when clearing filters
    if (pageSize === -1) {
      params.set("pageSize", "all");
    } else if (pageSize !== 50) {
      params.set("pageSize", pageSize.toString());
      params.set("page", "0");
    } else {
      params.set("page", "0");
    }
    router.replace(`/admin/users?${params.toString()}`, { scroll: false });
    // Trigger refetch to ensure data updates
    setTimeout(() => {
      refetchUsers();
    }, 100);
  };

  // Skeleton loader component
  const SkeletonTable = () => {
    const skeletonRows = Array.from({ length: 20 }, (_, i) => i);

    // Inject styles client-side only to avoid hydration errors
    useEffect(() => {
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
                  <col style={{ width: "40px" }} />
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "60%" }} />
                  <col style={{ width: "15%" }} />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left pl-2"></TableHead>
                    <TableHead className="text-left pl-4">User</TableHead>
                    <TableHead className="text-left">Roles</TableHead>
                    <TableHead className="text-left">Created</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
            </div>
          </div>
          <div className="flex-1 h-full relative">
            <ScrollArea className="h-full w-full">
              <div className="pb-3">
                <Table className="w-full table-fixed">
                  <colgroup>
                    <col style={{ width: "40px" }} />
                    <col style={{ width: "25%" }} />
                    <col style={{ width: "60%" }} />
                    <col style={{ width: "15%" }} />
                  </colgroup>
                  <TableBody>
                    {skeletonRows.map((row) => (
                      <TableRow key={row} className="h-[56px]">
                        <TableCell className="pl-2 py-2">
                          <Skeleton className="h-4 w-4" />
                        </TableCell>
                        <TableCell className="pl-4 py-2">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <div className="flex gap-2 flex-wrap">
                            <Skeleton className="h-5 w-16" />
                            <Skeleton className="h-5 w-20" />
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Spacer row to ensure last row is fully visible */}
                    <TableRow className="h-8 pointer-events-none">
                      <TableCell colSpan={4} className="p-0" />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Add New User and Search/Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4 flex-shrink-0">
        {/* Add New User Button or Action Buttons - Left */}
        <div className="flex items-center gap-2 h-8">
          {Object.keys(rowSelection).length > 0 ? (
            <div
              className="flex items-center gap-2 opacity-0 animate-slide-up-fade-in"
              style={{ animationFillMode: "forwards" }}
            >
              <div className="flex items-center gap-0.5 text-sm text-muted-foreground">
                <span className="pl-4">
                  {
                    Object.keys(rowSelection).filter((key) => rowSelection[key])
                      .length
                  }
                </span>
                <Check className="h-4 w-4" />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => e.preventDefault()}
                    className="h-8 w-8 cursor-not-allowed text-muted-foreground/25 hover:text-muted-foreground"
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bulk Email Disabled</TooltipContent>
              </Tooltip>
              <FeatureGuard feature="admin:delete-user">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="group h-8 w-8 bg-destructive/5 hover:bg-destructive/10 border border-transparent hover:border-destructive transition-all duration-200 ease-in-out"
                    >
                      <Trash2 className="h-4 w-4 text-destructive opacity-100 group-hover:animate-shake-twice" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              </FeatureGuard>
            </div>
          ) : (
            <Button
              onClick={() => {
                const params = new URLSearchParams(
                  searchParams?.toString() || ""
                );
                params.set("dialog", "add-new-user");
                router.push(`/admin/users?${params.toString()}`, {
                  scroll: false,
                });
              }}
              disabled={loading && users.length === 0}
              className="bg-transparent hover:bg-[var(--brand-bullyproof-primary)] text-[var(--brand-bullyproof-primary)] hover:text-white h-10 opacity-0 animate-slide-left-fade-in transition-colors"
              style={{ animationFillMode: "forwards" }}
            >
              <UserPlus className="h-4 w-4" />
              Add New User
            </Button>
          )}
        </div>

        {/* Vertical Separator */}
        <div className="h-6 w-px bg-border" />

        {/* Search and Filters - Right */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0 transition-all duration-200 ease-in-out">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-10 pr-10 transition-all duration-200 ease-in-out",
                debouncedSearchQuery.trim() &&
                  "border-orange-500 bg-orange-500/10"
              )}
              disabled={loading && users.length === 0}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {searchQuery !== debouncedSearchQuery || loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <CircleX className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Select
              value={roleFilter || "all"}
              onValueChange={handleRoleFilterChange}
              disabled={loading && users.length === 0}
            >
              <SelectTrigger
                className={cn(
                  "w-[180px]",
                  roleFilter &&
                    roleFilter !== "all" &&
                    "border-orange-500 bg-orange-500/10"
                )}
                disabled={loading && users.length === 0}
              >
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="__NONE__">None</SelectItem>
                {availableRoles.length > 0 ? (
                  availableRoles.map((role) => {
                    const roleKey = role.key || "";
                    const isAvailable = currentAvailableRoleKeys.has(roleKey);
                    const isSelected = roleFilter === roleKey;
                    const count = getRoleCount(roleKey);
                    return (
                      <SelectItem
                        key={role.id}
                        value={roleKey}
                        disabled={!isAvailable && !isSelected}
                        className={
                          !isAvailable && !isSelected ? "opacity-50" : ""
                        }
                        title={
                          !isAvailable && !isSelected ? "No results" : undefined
                        }
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{role.name}</span>
                          {isAvailable && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {count}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })
                ) : (
                  <SelectItem value="no-roles" disabled>
                    No roles available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            <Select
              value={schoolFilter || "all"}
              onValueChange={handleSchoolFilterChange}
              disabled={loading && users.length === 0}
            >
              <SelectTrigger
                className={cn(
                  "w-[200px]",
                  schoolFilter &&
                    schoolFilter !== "all" &&
                    "border-orange-500 bg-orange-500/10"
                )}
                disabled={loading && users.length === 0}
              >
                <SelectValue placeholder="School" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools</SelectItem>
                {allAvailableSchools.length > 0 ? (
                  allAvailableSchools.map((school) => {
                    const isAvailable = currentAvailableSchoolIds.has(
                      school.id
                    );
                    const isSelected = schoolFilter === school.id;
                    const count = getSchoolCount(school.id);
                    return (
                      <SelectItem
                        key={school.id}
                        value={school.id}
                        disabled={!isAvailable && !isSelected}
                        className={
                          !isAvailable && !isSelected ? "opacity-50" : ""
                        }
                        title={
                          !isAvailable && !isSelected ? "No results" : undefined
                        }
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{school.name}</span>
                          {isAvailable && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {count}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })
                ) : (
                  <SelectItem value="no-schools" disabled>
                    No schools available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Vertical Separator */}
        <div className="h-6 w-px bg-border" />

        {/* Clear Filters Button */}
        <Button
          variant="outline"
          onClick={clearFilters}
          className={cn(
            "flex items-center gap-1",
            hasActiveFilters &&
              "text-orange-500 border-orange-500/10 hover:text-orange-500 hover:bg-orange-500/10 animate-pulse",
            !hasActiveFilters &&
              "text-muted-foreground hover:cursor-not-allowed"
          )}
          disabled={(loading && users.length === 0) || !hasActiveFilters}
        >
          <CircleX className="h-4 w-4" />
          Clear Filters
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <SkeletonTable />
        ) : (
          <UsersTable
            users={users}
            roles={roles}
            onUserClick={handleUserClick}
            isLoading={loading}
            error={error}
            onRowSelectionChange={setRowSelection}
            showSelection={true}
            pageIndex={pageIndex}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>

      {/* User Detail Drawer */}
      <UserDetailDrawer
        user={selectedUser}
        open={isDrawerOpen}
        onOpenChange={handleDrawerClose}
        onUserUpdate={async () => {
          // Refresh users list
          await refetchUsers();
          await refetchAllUsers();
        }}
        onDeleteUserClick={
          selectedUser
            ? () => {
                const rowIndex = users.findIndex((u) => u.id === selectedUser.id);
                if (rowIndex >= 0) {
                  setRowSelection({ [rowIndex]: true });
                  setIsDeleteDialogOpen(true);
                }
              }
            : undefined
        }
      />

      {/* Add User Sheet */}
      <AddUserSheet
        open={isAddUserDialogOpen}
        onOpenChange={(open) => {
          const params = new URLSearchParams(searchParams?.toString() || "");
          if (open) {
            params.set("dialog", "add-new-user");
          } else {
            params.delete("dialog");
          }
          router.replace(`/admin/users?${params.toString()}`, {
            scroll: false,
          });
        }}
        onUserCreated={async () => {
          // Refresh users list
          await refetchUsers();
          await refetchAllUsers();
        }}
        onOpenExistingUser={handleOpenExistingUser}
      />

      {/* Delete Users Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Users</DialogTitle>
            <DialogDescription>
              You're about to delete these users:
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 py-4">
              {Object.keys(rowSelection)
                .filter((key) => rowSelection[key])
                .map((rowIndex) => {
                  const user = users[parseInt(rowIndex)];
                  if (!user) return null;
                  const fullName = [user.firstName, user.lastName]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <div className="font-medium">
                          {fullName || user.email}
                        </div>
                        {fullName && (
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
                .filter(Boolean)}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setIsConfirmDeleteDialogOpen(true);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog
        open={isConfirmDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsConfirmDeleteDialogOpen(open);
          if (!open) {
            setDeleteError(null);
            setIsDeleting(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action is irreversible. Are you absolutely sure you want to
              delete these users?
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmDeleteDialogOpen(false);
                setRowSelection({});
                setDeleteError(null);
                setIsDeleting(false);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                const selectedUserIds = Object.keys(rowSelection)
                  .filter((key) => rowSelection[key])
                  .map((rowIndex) => {
                    const user = users[parseInt(rowIndex)];
                    return user?.id;
                  })
                  .filter(Boolean) as string[];

                if (selectedUserIds.length === 0) {
                  setIsConfirmDeleteDialogOpen(false);
                  setRowSelection({});
                  return;
                }

                setIsDeleting(true);
                setDeleteError(null);

                try {
                  const result = await apiFetch<{
                    success: boolean;
                    deleted: number;
                    failed: number;
                    results: {
                      successful: string[];
                      failed: Array<{ userId: string; error: string }>;
                    };
                  }>("/users/delete", {
                    method: "DELETE",
                    body: JSON.stringify({ userIds: selectedUserIds }),
                  });

                  if (result.error) {
                    setDeleteError(
                      result.error.message || "Failed to delete users"
                    );
                    setIsDeleting(false);
                    return;
                  }

                  if (result.data) {
                    const { deleted, failed, results } = result.data;

                    // Always refresh the list to show current state
                    await refetchUsers();
                    await refetchAllUsers();

                    if (failed > 0) {
                      // Partial success - show error but keep dialog open
                      const failedMessages = results.failed
                        .map((f) => {
                          const failedUser = users.find(
                            (u) => u.id === f.userId
                          );
                          const userName = failedUser
                            ? [failedUser.firstName, failedUser.lastName]
                                .filter(Boolean)
                                .join(" ") || failedUser.email
                            : f.userId;
                          return `${userName}: ${f.error}`;
                        })
                        .join(", ");
                      setDeleteError(
                        `Successfully deleted ${deleted} user(s), but failed to delete ${failed} user(s): ${failedMessages}`
                      );
                      // Clear selection for successfully deleted users
                      const newSelection: Record<string, boolean> = {};
                      Object.keys(rowSelection).forEach((key) => {
                        const user = users[parseInt(key)];
                        if (user && !results.successful.includes(user.id)) {
                          newSelection[key] = true;
                        }
                      });
                      setRowSelection(newSelection);
                    } else {
                      // Complete success - close dialogs and clear selection
                      setIsConfirmDeleteDialogOpen(false);
                      setRowSelection({});
                    }
                  }
                } catch (error: any) {
                  console.error("[USER DELETE] Error:", error);
                  setDeleteError(
                    error.message || "An unexpected error occurred"
                  );
                } finally {
                  setIsDeleting(false);
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminUsersPage() {
  usePageTitle(["admin", "users"]);
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading users...</p>
          </div>
        </div>
      }
    >
      <AdminUsersPageContent />
    </Suspense>
  );
}
