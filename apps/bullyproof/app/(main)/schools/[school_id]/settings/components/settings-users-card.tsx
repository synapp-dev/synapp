"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import { meApi } from "@/entities/me/api/endpoints";
import { useUsers, useRoles } from "@/entities/users/model/store";
import { userKeys } from "@/entities/users/model/keys";
import { UsersTable } from "@/entities/users/ui/users-table";
import { AddManualUserDialog } from "@/entities/dashboard/ui/admin/sections/schools/components/add-manual-user-dialog";
import { SchoolSettingsUserDetailDrawer } from "./school-settings-user-detail-drawer";
import { apiFetch } from "@/lib/api/fetcher.client";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import {
  Search,
  Loader2,
  AlertCircle,
  CircleX,
  UserPlus,
  Trash2,
  Check,
} from "lucide-react";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import type { School } from "@/entities/dashboard/ui/admin/sections/schools/components/schools-table-columns";

interface SettingsUsersCardProps {
  schoolId: string;
  schoolSlug: string;
  schoolName: string;
  basePath: string;
}

function rawToUserWithRoles(raw: {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  metadata?: unknown;
  platformRoles?: string[] | string;
  schoolRoles?: unknown;
}): UserWithRolesAndSchools {
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
  return {
    id: raw.id,
    firstName: raw.firstName ?? null,
    lastName: raw.lastName ?? null,
    email: raw.email,
    avatarUrl: raw.avatarUrl,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    metadata: raw.metadata,
    platformRoles,
    schoolRoles,
    lastLoginAt: null,
  };
}

export function SettingsUsersCard({
  schoolId,
  schoolSlug,
  schoolName,
  basePath,
}: SettingsUsersCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const userIdFromUrl = searchParams?.get("id") || null;
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [selectedUser, setSelectedUser] =
    useState<UserWithRolesAndSchools | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isConfirmRemoveDialogOpen, setIsConfirmRemoveDialogOpen] =
    useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const offset = pageIndex * pageSize;

  const {
    users,
    totalCount,
    isLoading: isLoadingUsers,
    error: queryError,
    refetch: refetchUsers,
  } = useUsers({
    schoolId,
    search: debouncedSearchQuery || undefined,
    role: roleFilter || undefined,
    limit: pageSize,
    offset,
  });

  const { roles, isLoading: isLoadingRoles } = useRoles();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPageIndex(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync URL to drawer state
  useEffect(() => {
    if (!userIdFromUrl) {
      setIsDrawerOpen(false);
      setSelectedUser(null);
      return;
    }
    const userInList = users.find((u) => u.id === userIdFromUrl);
    if (userInList) {
      setSelectedUser(userInList);
      setIsDrawerOpen(true);
      return;
    }
    // User not in list (e.g. pagination) - fetch by ID
    let cancelled = false;
    (async () => {
      const result = await meApi.get.userById(userIdFromUrl);
      if (cancelled || !result.data) return;
      const user = rawToUserWithRoles(result.data);
      setSelectedUser(user);
      setIsDrawerOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userIdFromUrl, users]);

  const handleDrawerClose = () => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("id");
    params.delete("tab");
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    setIsDrawerOpen(false);
    setSelectedUser(null);
  };

  const loading = isLoadingUsers || isLoadingRoles;
  const error = queryError?.message || null;

  const schoolForDialog: School = {
    id: schoolId,
    name: schoolName,
    state: null,
    sector: null,
    teacherCount: 0,
    classCount: 0,
    schoolAdminCount: 0,
    schoolLicenceCount: 0,
    activeLicence: false,
    status: "active",
    slug: schoolSlug,
  };

  const handleUserClick = (user: UserWithRolesAndSchools) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("id", user.id);
    router.push(`${basePath}?${params.toString()}`, { scroll: false });
    setSelectedUser(user);
    setIsDrawerOpen(true);
  };

  const selectedCount = Object.keys(rowSelection).filter(
    (key) => rowSelection[key]
  ).length;

  const availableRoles = roles
    .filter((r) => r.key)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const currentAvailableRoleKeys = new Set(
    users.flatMap((u) => [
      ...u.platformRoles,
      ...u.schoolRoles.map((sr) => sr.roleKey).filter(Boolean),
    ])
  );

  const getRoleCount = (roleKey: string) =>
    users.filter(
      (u) =>
        u.platformRoles.includes(roleKey) ||
        u.schoolRoles.some((sr) => sr.roleKey === roleKey)
    ).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {selectedCount > 0 ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 text-sm text-muted-foreground">
                <span>{selectedCount}</span>
                <Check className="h-4 w-4" />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsRemoveDialogOpen(true)}
                    className="group h-8 w-8 bg-destructive/5 hover:bg-destructive/10 border border-transparent hover:border-destructive transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Remove from School</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <Button
              onClick={() => setIsAddUserDialogOpen(true)}
              disabled={loading && users.length === 0}
              className="bg-transparent hover:bg-[var(--brand-bullyproof-primary)] text-[var(--brand-bullyproof-primary)] hover:text-white h-10"
            >
              <UserPlus className="h-4 w-4" />
              Add User
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0 max-w-md">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-10 pr-10",
                debouncedSearchQuery.trim() && "border-orange-500 bg-orange-500/10"
              )}
              disabled={loading && users.length === 0}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {searchQuery !== debouncedSearchQuery || loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <CircleX className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
          <Select
            value={roleFilter || "all"}
            onValueChange={(v) => {
              setRoleFilter(v === "all" ? "" : v);
              setPageIndex(0);
            }}
            disabled={loading && users.length === 0}
          >
            <SelectTrigger
              className={cn(
                "w-[160px]",
                roleFilter && roleFilter !== "all" && "border-orange-500 bg-orange-500/10"
              )}
            >
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="__NONE__">None</SelectItem>
              {availableRoles.map((role) => {
                const key = role.key || "";
                const isAvailable = currentAvailableRoleKeys.has(key);
                const isSelected = roleFilter === key;
                const count = getRoleCount(key);
                return (
                  <SelectItem
                    key={role.id}
                    value={key}
                    disabled={!isAvailable && !isSelected}
                    className={!isAvailable && !isSelected ? "opacity-50" : ""}
                    title={!isAvailable && !isSelected ? "No results" : undefined}
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
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <UsersTable
        users={users}
        roles={roles}
        isLoading={loading}
        error={error}
        onUserClick={handleUserClick}
        onRowSelectionChange={setRowSelection}
        schoolId={schoolId}
        showSelection={true}
        pageIndex={pageIndex}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPageIndex}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageIndex(0);
        }}
      />

      <SchoolSettingsUserDetailDrawer
        user={selectedUser}
        open={isDrawerOpen}
        onOpenChange={(open) => {
          if (!open) handleDrawerClose();
        }}
        schoolId={schoolId}
        onUserUpdate={refetchUsers}
      />

      <AddManualUserDialog
        open={isAddUserDialogOpen}
        onOpenChange={setIsAddUserDialogOpen}
        school={schoolForDialog}
        onSuccess={async () => {
          await new Promise((r) => setTimeout(r, 500));
          await queryClient.invalidateQueries({ queryKey: userKeys.all });
          refetchUsers();
        }}
      />

      {/* Remove from School Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Users from School</DialogTitle>
            <DialogDescription>
              You&apos;re about to remove these users from {schoolName}. This
              will remove all their roles, positions, and class associations for
              this school. The users themselves will not be deleted.
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
            <Button variant="outline" onClick={() => setIsRemoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsRemoveDialogOpen(false);
                setIsConfirmRemoveDialogOpen(true);
              }}
            >
              Remove from School
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Remove Dialog */}
      <Dialog
        open={isConfirmRemoveDialogOpen}
        onOpenChange={(open) => {
          setIsConfirmRemoveDialogOpen(open);
          if (!open) {
            setRemoveError(null);
            setIsRemoving(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This will remove all roles, positions, and class associations for
              these users at {schoolName}. The users themselves will not be
              deleted and can be added back to the school later if needed.
            </DialogDescription>
          </DialogHeader>
          {removeError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{removeError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmRemoveDialogOpen(false);
                setRowSelection({});
                setRemoveError(null);
                setIsRemoving(false);
              }}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                const selectedUserIds = Object.keys(rowSelection)
                  .filter((key) => rowSelection[key])
                  .map((rowIndex) => users[parseInt(rowIndex)]?.id)
                  .filter(Boolean) as string[];

                if (selectedUserIds.length === 0) {
                  setIsConfirmRemoveDialogOpen(false);
                  setRowSelection({});
                  return;
                }

                setIsRemoving(true);
                setRemoveError(null);

                try {
                  const result = await apiFetch<{
                    success: boolean;
                    removed: number;
                    failed: number;
                    results: {
                      successful: string[];
                      failed: Array<{ userId: string; error: string }>;
                    };
                  }>(`/schools/${schoolId}/users/remove`, {
                    method: "POST",
                    body: JSON.stringify({ userIds: selectedUserIds }),
                  });

                  if (result.error) {
                    setRemoveError(
                      result.error.message ||
                        "Failed to remove users from school"
                    );
                    setIsRemoving(false);
                    return;
                  }

                  if (result.data) {
                    const { removed, failed, results } = result.data;

                    await queryClient.invalidateQueries({
                      queryKey: userKeys.all,
                    });

                    if (failed > 0) {
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
                      setRemoveError(
                        `Successfully removed ${removed} user(s), but failed to remove ${failed}: ${failedMessages}`
                      );
                      const newSelection: Record<string, boolean> = {};
                      Object.keys(rowSelection).forEach((key) => {
                        const user = users[parseInt(key)];
                        if (user && !results.successful.includes(user.id)) {
                          newSelection[key] = true;
                        }
                      });
                      setRowSelection(newSelection);
                    } else {
                      setIsConfirmRemoveDialogOpen(false);
                      setRowSelection({});
                    }
                  }
                } catch (err: unknown) {
                  console.error("[REMOVE USERS] Error:", err);
                  setRemoveError(
                    err instanceof Error
                      ? err.message
                      : "An unexpected error occurred"
                  );
                } finally {
                  setIsRemoving(false);
                }
              }}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove from School"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
