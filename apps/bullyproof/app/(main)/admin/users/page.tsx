"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  meApi,
  type UserWithRolesAndSchools,
} from "@/entities/me/api/endpoints";
import { rolesApi } from "@/entities/roles/api/endpoints";
import type { roles } from "@/server/db/schema";

type Role = typeof roles.$inferSelect;

import { usePageTitle } from "@/hooks/use-page-title";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Search, Users, Loader2, AlertCircle, X, Plus } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { UserDetailDrawer } from "./components/user-detail-drawer";
import { UsersDataTable } from "./components/users-data-table";
import { AddUserSheet } from "./components/add-user-sheet";

function AdminUsersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<UserWithRolesAndSchools[]>([]);
  const [allUsers, setAllUsers] = useState<UserWithRolesAndSchools[]>([]); // All users for filter options
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(
    searchParams?.get("search") || ""
  );
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [selectedUser, setSelectedUser] =
    useState<UserWithRolesAndSchools | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddUserSheetOpen, setIsAddUserSheetOpen] = useState(false);

  // Get filters from URL query params
  const roleFilter = searchParams?.get("role") || "";
  const schoolFilter = searchParams?.get("schoolId") || "";
  const userIdFromUrl = searchParams?.get("user") || null;

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
    params.set("user", user.id);
    router.push(`/admin/users?${params.toString()}`, { scroll: false });
  };

  const handleDrawerClose = (open: boolean) => {
    setIsDrawerOpen(open);
    if (!open) {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.delete("user");
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

  const loadUsers = useCallback(
    async (search?: string, role?: string, schoolId?: string) => {
      try {
        setLoading(true);
        setError(null);
        const result = await meApi.get.listAllUsers({
          limit: 100,
          offset: 0,
          search: search || undefined,
          role: role || undefined,
          schoolId: schoolId || undefined,
        });

        if (result.error) {
          setError(result.error.message || "Failed to load users");
          setUsers([]);
        } else {
          setUsers(result.data || []);
        }
      } catch (err: any) {
        setError(err.message || "An error occurred");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Load all users once on mount to populate filter options
  useEffect(() => {
    const loadAllUsers = async () => {
      try {
        const result = await meApi.get.listAllUsers({
          limit: 100,
          offset: 0,
        });
        if (result.data) {
          setAllUsers(result.data);
        }
      } catch (err) {
        console.error("Failed to load all users for filters:", err);
      }
    };
    loadAllUsers();
  }, []);

  // Load roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const result = await rolesApi.get.list();
        if (result.data) {
          setRoles(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch roles:", err);
      }
    };
    fetchRoles();
  }, []);

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

  useEffect(() => {
    loadUsers(
      debouncedSearchQuery || undefined,
      roleFilter || undefined,
      schoolFilter || undefined
    );
  }, [debouncedSearchQuery, roleFilter, schoolFilter, loadUsers]);

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
    const params = new URLSearchParams();
    router.replace("/admin/users", { scroll: false });
  };

  if (loading && users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Users className="w-8 h-8 text-foreground" />
          <h1 className="text-2xl font-semibold">Users</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sticky Header and Search/Filters */}
      <div className="sticky top-16 z-10 bg-background backdrop-blur supports-[backdrop-filter]:bg-background/90 -mx-6 px-6 border-b">
        {/* Header */}
        <div className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Users className="w-8 h-8 text-foreground" />
              <h1 className="text-2xl font-semibold">Users</h1>
              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 ml-2">
                  {debouncedSearchQuery && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1 cursor-pointer hover:bg-secondary/80 transition-colors"
                      onClick={() => setSearchQuery("")}
                    >
                      Search: {debouncedSearchQuery}
                      <X className="h-3 w-3" />
                    </Badge>
                  )}
                  {roleFilter && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1 cursor-pointer hover:bg-secondary/80 transition-colors"
                      onClick={() => handleRoleFilterChange("all")}
                    >
                      Role:{" "}
                      {availableRoles.find((r) => r.key === roleFilter)?.name ||
                        roleFilter}
                      <span className="ml-1 text-xs bg-background/50 px-1.5 py-0.5 rounded">
                        {getRoleCount(roleFilter)}
                      </span>
                      <X className="h-3 w-3" />
                    </Badge>
                  )}
                  {schoolFilter && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1 cursor-pointer hover:bg-secondary/80 transition-colors"
                      onClick={() => handleSchoolFilterChange("all")}
                    >
                      School:{" "}
                      {allAvailableSchools.find((s) => s.id === schoolFilter)
                        ?.name || schoolFilter}
                      <span className="ml-1 text-xs bg-background/50 px-1.5 py-0.5 rounded">
                        {getSchoolCount(schoolFilter)}
                      </span>
                      <X className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <Button onClick={() => setIsAddUserSheetOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add New User
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="pb-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative w-full sm:w-1/2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {searchQuery !== debouncedSearchQuery || loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="flex gap-2">
              {availableRoles.length > 0 && (
                <Select
                  value={roleFilter || "all"}
                  onValueChange={handleRoleFilterChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {availableRoles.map((role) => {
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
                            !isAvailable && !isSelected
                              ? "No results"
                              : undefined
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
                    })}
                  </SelectContent>
                </Select>
              )}

              {allAvailableSchools.length > 0 && (
                <Select
                  value={schoolFilter || "all"}
                  onValueChange={handleSchoolFilterChange}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="School" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schools</SelectItem>
                    {allAvailableSchools.map((school) => {
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
                            !isAvailable && !isSelected
                              ? "No results"
                              : undefined
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
                    })}
                  </SelectContent>
                </Select>
              )}

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <UsersDataTable
          users={users}
          roles={roles}
          onUserClick={handleUserClick}
          isLoading={loading}
          error={error}
        />
      </div>

      {/* User Detail Drawer */}
      <UserDetailDrawer
        user={selectedUser}
        open={isDrawerOpen}
        onOpenChange={handleDrawerClose}
        onUserUpdate={async () => {
          // Refresh users list
          await loadUsers(
            debouncedSearchQuery || undefined,
            roleFilter || undefined,
            schoolFilter || undefined
          );
        }}
      />

      {/* Add User Sheet */}
      <AddUserSheet
        open={isAddUserSheetOpen}
        onOpenChange={setIsAddUserSheetOpen}
        onUserCreated={async () => {
          // Refresh users list
          await loadUsers(
            debouncedSearchQuery || undefined,
            roleFilter || undefined,
            schoolFilter || undefined
          );
        }}
      />
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
