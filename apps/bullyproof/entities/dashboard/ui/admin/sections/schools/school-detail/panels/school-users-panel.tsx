"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  AlertCircle,
  Check,
  CircleX,
  FileSpreadsheet,
  Loader2,
  Search,
  Shield,
  Trash2,
  UserPlus,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { type UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import { useListSchoolsQuery } from "@/entities/school/model/useListSchoolsQuery";
import { useRoles, useUsers } from "@/entities/users/model/store";
import { userKeys } from "@/entities/users/model/keys";
import { UsersTable } from "@/entities/users/ui/users-table";
import {
  buildUserRefreshCatalog,
  createUserDetailOnUserUpdateHandler,
} from "@/entities/users/lib/refresh-selected-user";
import { UserDetailDrawer } from "@/app/(main)/admin/users/components/user-detail-drawer";
import { apiFetch } from "@/lib/api/fetcher.client";
import { AddManualUserDialog } from "../../components/add-manual-user-dialog";
import { BulkRoleDialog } from "../../components/bulk-role-dialog";
import { ImportUsersDialog } from "../../components/import-users-dialog";
import { useSchoolDetail } from "../school-detail-context";

export function SchoolUsersPanel() {
  const { school, open, activeSection, onSchoolUpdate } = useSchoolDetail();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [usersPageIndex, setUsersPageIndex] = useState(0);
  const [usersPageSize, setUsersPageSize] = useState(50);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const [selectedUser, setSelectedUser] =
    useState<UserWithRolesAndSchools | null>(null);
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);

  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [importUsersDialogOpen, setImportUsersDialogOpen] = useState(false);
  const [bulkRoleDialogOpen, setBulkRoleDialogOpen] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] =
    useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isClosingDialogRef = useRef(false);
  const prevUsersSectionRef = useRef<string | null>(null);
  const prevDialogParamRef = useRef<string | null>(null);

  const dialogParam = searchParams?.get("dialog") || null;
  const userIdFromUrl = searchParams?.get("id") || null;

  const { roles } = useRoles();
  const { data: allSchools = [] } = useListSchoolsQuery({ limit: 100 });

  const usersListOffset =
    usersPageSize === -1 ? 0 : usersPageIndex * usersPageSize;

  const {
    users,
    totalCount: usersTotalCount,
    isLoading: loadingUsers,
    error: usersError,
    refetch: refetchUsers,
  } = useUsers({
    search: debouncedSearchQuery || undefined,
    role: roleFilter && roleFilter !== "all" ? roleFilter : undefined,
    schoolId: school.id,
    limit: usersPageSize,
    offset: usersListOffset,
  });

  const userRefreshCatalog = useMemo(
    () =>
      buildUserRefreshCatalog(
        allSchools.map((s) => ({ id: s.id, name: s.name })),
        roles
      ),
    [allSchools, roles]
  );

  const handleUserDetailUpdate = useMemo(
    () =>
      createUserDetailOnUserUpdateHandler({
        userId: selectedUser?.id,
        selectedUser,
        setSelectedUser,
        refetchLists: refetchUsers,
        catalog: userRefreshCatalog,
      }),
    [selectedUser, refetchUsers, userRefreshCatalog]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setUsersPageIndex(0);
      setRowSelection({});
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setUsersPageIndex(0);
    setRowSelection({});
  }, [roleFilter]);

  useEffect(() => {
    setUsersPageIndex(0);
    setRowSelection({});
  }, [school.id]);

  useEffect(() => {
    if (activeSection === "users") {
      if (prevUsersSectionRef.current !== "users") {
        refetchUsers();
        prevUsersSectionRef.current = "users";
      }
    } else {
      prevUsersSectionRef.current = activeSection;
    }
  }, [activeSection, school.id, refetchUsers]);

  useEffect(() => {
    if (userIdFromUrl && activeSection === "users" && users.length > 0) {
      const user = users.find((u) => u.id === userIdFromUrl);
      if (user) {
        setSelectedUser(user);
        setIsUserDrawerOpen(true);
      }
    } else if (!userIdFromUrl) {
      setIsUserDrawerOpen(false);
      setSelectedUser(null);
    }
  }, [userIdFromUrl, users, activeSection]);

  useEffect(() => {
    if (isClosingDialogRef.current) {
      return;
    }

    const dialogParamChanged = prevDialogParamRef.current !== dialogParam;
    if (!dialogParamChanged && !open) {
      return;
    }
    prevDialogParamRef.current = dialogParam;

    if (open && activeSection === "users") {
      if (dialogParam === "add-user" && !addUserDialogOpen) {
        setAddUserDialogOpen(true);
        if (importUsersDialogOpen) {
          setImportUsersDialogOpen(false);
        }
      } else if (dialogParam === "import-users" && !importUsersDialogOpen) {
        setImportUsersDialogOpen(true);
        if (addUserDialogOpen) {
          setAddUserDialogOpen(false);
        }
      } else if (!dialogParam) {
        if (addUserDialogOpen) {
          setAddUserDialogOpen(false);
        }
        if (importUsersDialogOpen) {
          setImportUsersDialogOpen(false);
        }
      }
    }
  }, [
    open,
    school.id,
    activeSection,
    dialogParam,
    addUserDialogOpen,
    importUsersDialogOpen,
  ]);

  const handleSchoolUsersPageChange = (nextIndex: number) => {
    setUsersPageIndex(nextIndex);
    setRowSelection({});
  };

  const handleSchoolUsersPageSizeChange = (nextSize: number) => {
    setUsersPageSize(nextSize);
    setUsersPageIndex(0);
    setRowSelection({});
  };

  const clearDialogParam = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("dialog");
    const newUrl = params.toString()
      ? `/admin/schools?${params.toString()}`
      : "/admin/schools";
    router.replace(newUrl, { scroll: false });
  }, [router, searchParams]);

  const closeUrlSyncedDialog = useCallback(
    (close: () => void) => {
      isClosingDialogRef.current = true;
      close();
      clearDialogParam();
      setTimeout(() => {
        isClosingDialogRef.current = false;
      }, 100);
    },
    [clearDialogParam]
  );

  const invalidateUsersAndRefreshSchool = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await queryClient.invalidateQueries({ queryKey: userKeys.all });
    onSchoolUpdate?.();
  }, [queryClient, onSchoolUpdate]);

  const handleAddUserClick = () => {
    setAddUserDialogOpen(true);
    if (school.slug) {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("school", school.slug);
      params.set("tab", "users");
      params.set("dialog", "add-user");
      router.push(`/admin/schools?${params.toString()}`, { scroll: false });
    }
  };

  const handleImportDataClick = () => {
    setImportUsersDialogOpen(true);
    if (school.slug) {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("school", school.slug);
      params.set("tab", "users");
      params.set("dialog", "import-users");
      router.push(`/admin/schools?${params.toString()}`, { scroll: false });
    }
  };

  const handleUserClick = (user: UserWithRolesAndSchools) => {
    setSelectedUser(user);
    setIsUserDrawerOpen(true);
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("id", user.id);
    params.set("userTab", "details");
    router.push(`/admin/schools?${params.toString()}`, { scroll: false });
  };

  const handleUserDrawerClose = (nextOpen: boolean) => {
    setIsUserDrawerOpen(nextOpen);
    if (!nextOpen) {
      setSelectedUser(null);
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.delete("id");
      params.delete("userTab");
      params.delete("userHistoryTab");
      router.push(`/admin/schools?${params.toString()}`, { scroll: false });
    }
  };

  const selectedCount = Object.keys(rowSelection).filter(
    (key) => rowSelection[key]
  ).length;

  const tabContent =
    activeSection === "users" ? (
      <div className="flex flex-col flex-1 min-h-0 gap-4 pt-1">
        <div className="flex shrink-0 items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 h-8">
            {selectedCount > 0 ? (
              <div
                className="flex items-center gap-2 opacity-0 animate-slide-up-fade-in"
                style={{ animationFillMode: "forwards" }}
              >
                <div className="flex items-center gap-0.5 text-sm text-muted-foreground">
                  <span className="pl-4">{selectedCount}</span>
                  <Check className="h-4 w-4" />
                </div>
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
                  <TooltipContent>Remove from School</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <>
                <Button
                  onClick={handleAddUserClick}
                  disabled={loadingUsers && users.length === 0}
                  className="bg-transparent hover:bg-[var(--brand-bullyproof-primary)] text-[var(--brand-bullyproof-primary)] hover:text-white h-10 opacity-0 animate-slide-left-fade-in transition-colors"
                  style={{ animationFillMode: "forwards" }}
                >
                  <UserPlus className="h-4 w-4" />
                  Add User
                </Button>
                <Button
                  onClick={handleImportDataClick}
                  variant="outline"
                  disabled={loadingUsers && users.length === 0}
                  className="h-10 opacity-0 animate-slide-left-fade-in transition-colors"
                  style={{ animationFillMode: "forwards" }}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Import Data
                </Button>
                <Button
                  onClick={() => setBulkRoleDialogOpen(true)}
                  variant="outline"
                  disabled={loadingUsers && users.length === 0}
                  className="h-10 opacity-0 animate-slide-left-fade-in transition-colors"
                  style={{ animationFillMode: "forwards" }}
                >
                  <Shield className="h-4 w-4" />
                  Bulk Edit
                </Button>
              </>
            )}
          </div>

          <div className="h-6 w-px bg-border" />

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
                disabled={loadingUsers && users.length === 0}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {searchQuery !== debouncedSearchQuery || loadingUsers ? (
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
                onValueChange={setRoleFilter}
                disabled={loadingUsers && users.length === 0}
              >
                <SelectTrigger
                  className={cn(
                    "w-[180px]",
                    roleFilter &&
                      roleFilter !== "all" &&
                      "border-orange-500 bg-orange-500/10"
                  )}
                  disabled={loadingUsers && users.length === 0}
                >
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles
                    .filter((role) => role.key)
                    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                    .map((role) => {
                      const roleKey = role.key || "";
                      const count = users.filter((user) => {
                        const schoolRoles = user.schoolRoles.filter(
                          (sr) =>
                            sr.schoolId === school.id && sr.roleKey === roleKey
                        );
                        return schoolRoles.length > 0;
                      }).length;
                      return (
                        <SelectItem key={role.id} value={roleKey}>
                          <div className="flex items-center justify-between w-full">
                            <span>{role.name}</span>
                            {count > 0 && (
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

          {(searchQuery.trim() || (roleFilter && roleFilter !== "all")) && (
            <>
              <div className="h-6 w-px bg-border" />
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setDebouncedSearchQuery("");
                  setRoleFilter("");
                  setUsersPageIndex(0);
                  setRowSelection({});
                }}
                className={cn(
                  "flex items-center gap-1",
                  "text-orange-500 border-orange-500/10 hover:text-orange-500 hover:bg-orange-500/10"
                )}
                disabled={loadingUsers && users.length === 0}
              >
                <CircleX className="h-4 w-4" />
                Clear Filters
              </Button>
            </>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex min-h-0 flex-1 flex-col">
            <UsersTable
              users={users}
              roles={roles}
              isLoading={loadingUsers}
              error={usersError?.message || null}
              schoolId={school.id}
              showSelection={true}
              onUserClick={handleUserClick}
              onRowSelectionChange={setRowSelection}
              pageIndex={usersPageIndex}
              pageSize={usersPageSize}
              totalCount={usersTotalCount}
              onPageChange={handleSchoolUsersPageChange}
              onPageSizeChange={handleSchoolUsersPageSizeChange}
            />
          </div>
          {Object.keys(rowSelection).length > 0 && (
            <div className="flex shrink-0 items-center justify-end space-x-2 py-2">
              <div className="text-muted-foreground flex-1 text-sm">
                {Object.keys(rowSelection).length} of {users.length} row(s)
                selected.
              </div>
            </div>
          )}
        </div>
      </div>
    ) : null;

  return (
    <>
      {tabContent}

      <AddManualUserDialog
        open={addUserDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeUrlSyncedDialog(() => setAddUserDialogOpen(false));
          } else {
            setAddUserDialogOpen(true);
          }
        }}
        school={school}
        onSuccess={invalidateUsersAndRefreshSchool}
      />

      <ImportUsersDialog
        open={importUsersDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeUrlSyncedDialog(() => setImportUsersDialogOpen(false));
          } else {
            setImportUsersDialogOpen(nextOpen);
          }
        }}
        school={school}
        onSuccess={invalidateUsersAndRefreshSchool}
      />

      <BulkRoleDialog
        open={bulkRoleDialogOpen}
        onOpenChange={setBulkRoleDialogOpen}
        school={school}
        onSuccess={invalidateUsersAndRefreshSchool}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Users from School</DialogTitle>
            <DialogDescription>
              You&apos;re about to remove these users from {school.name}. This
              will remove all their roles, positions, and class associations for
              this school. The users themselves will not be deleted.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 py-4">
              {Object.keys(rowSelection)
                .filter((key) => rowSelection[key])
                .map((rowIndex) => {
                  const user = users[parseInt(rowIndex, 10)];
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
              Remove from School
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isConfirmDeleteDialogOpen}
        onOpenChange={(nextOpen) => {
          setIsConfirmDeleteDialogOpen(nextOpen);
          if (!nextOpen) {
            setDeleteError(null);
            setIsDeleting(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This will remove all roles, positions, and class associations for
              these users at {school.name}. The users themselves will not be
              deleted and can be added back to the school later if needed.
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
                  .map((rowIndex) => users[parseInt(rowIndex, 10)]?.id)
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
                    removed: number;
                    failed: number;
                    results: {
                      successful: string[];
                      failed: Array<{ userId: string; error: string }>;
                    };
                  }>(`/schools/${school.id}/users/remove`, {
                    method: "POST",
                    body: JSON.stringify({ userIds: selectedUserIds }),
                  });

                  if (result.error) {
                    setDeleteError(
                      result.error.message ||
                        "Failed to remove users from school"
                    );
                    setIsDeleting(false);
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
                      setDeleteError(
                        `Successfully removed ${removed} user(s) from school, but failed to remove ${failed} user(s): ${failedMessages}`
                      );
                      const newSelection: Record<string, boolean> = {};
                      Object.keys(rowSelection).forEach((key) => {
                        const user = users[parseInt(key, 10)];
                        if (user && !results.successful.includes(user.id)) {
                          newSelection[key] = true;
                        }
                      });
                      setRowSelection(newSelection);
                    } else {
                      setIsConfirmDeleteDialogOpen(false);
                      setRowSelection({});
                    }
                  }
                } catch (error: unknown) {
                  console.error("[REMOVE USERS FROM SCHOOL] Error:", error);
                  setDeleteError(
                    error instanceof Error
                      ? error.message
                      : "An unexpected error occurred"
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
                  Removing...
                </>
              ) : (
                "Remove from School"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserDetailDrawer
        user={selectedUser}
        open={isUserDrawerOpen}
        onOpenChange={handleUserDrawerClose}
        onUserUpdate={handleUserDetailUpdate}
      />
    </>
  );
}
