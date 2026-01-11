"use client";

import { useEffect, useState, Suspense } from "react";
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
import { UsersDataTable } from "./components/users-data-table";
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

function AdminUsersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(
    searchParams?.get("search") || ""
  );
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [selectedUser, setSelectedUser] =
    useState<UserWithRolesAndSchools | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] =
    useState(false);

  // Get filters from URL query params
  const roleFilter = searchParams?.get("role") || "";
  const schoolFilter = searchParams?.get("schoolId") || "";
  const userIdFromUrl = searchParams?.get("id") || null;
  const isAddUserDialogOpen = searchParams?.get("dialog") === "add-new-user";

  // Use React Query hooks for data fetching
  const {
    users,
    isLoading: isLoadingUsers,
    error: queryError,
    refetch: refetchUsers,
  } = useUsers({
    search: debouncedSearchQuery || undefined,
    role: roleFilter || undefined,
    schoolId: schoolFilter || undefined,
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
    new Map(
      users
        .flatMap((user) => user.schoolRoles)
        .filter((sr) => sr.schoolId && sr.schoolName)
        .map((sr) => [sr.schoolId, { id: sr.schoolId, name: sr.schoolName! }])
    ).values()
  );

  const currentAvailableSchoolIds = new Set(
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

  // Debounce search query updates (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      const params = new URLSearchParams(searchParams?.toString() || "");
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      } else {
        params.delete("search");
      }
      router.replace(`/admin/users?${params.toString()}`, { scroll: false });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, router, searchParams]);

  const handleRoleFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (value && value !== "all") {
      params.set("role", value);
    } else {
      params.delete("role");
    }
    router.push(`/admin/users?${params.toString()}`, { scroll: false });
  };

  const handleSchoolFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (value && value !== "all") {
      params.set("schoolId", value);
    } else {
      params.delete("schoolId");
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
    router.replace("/admin/users", { scroll: false });
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
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "60%" }} />
                  <col style={{ width: "15%" }} />
                </colgroup>
                <TableHeader>
                  <TableRow>
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
              <Table className="w-full table-fixed">
                <colgroup>
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "60%" }} />
                  <col style={{ width: "15%" }} />
                </colgroup>
                <TableBody>
                  {skeletonRows.map((row) => (
                    <TableRow key={row}>
                      <TableCell className="pl-4">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
          <UsersDataTable
            users={users}
            roles={roles}
            onUserClick={handleUserClick}
            isLoading={loading}
            error={error}
            onRowSelectionChange={setRowSelection}
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
        onOpenChange={setIsConfirmDeleteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action is irreversible. Are you absolutely sure you want to
              delete these users?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmDeleteDialogOpen(false);
                setRowSelection({});
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                // TODO: Implement actual delete logic
                setIsConfirmDeleteDialogOpen(false);
                setRowSelection({});
                // Refresh users list after deletion
                refetchUsers();
                refetchAllUsers();
              }}
            >
              Delete
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
