"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Pencil } from "lucide-react";
import { RoleBadges } from "@/components/atoms/role-badges";
import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import { rolesApi } from "@/entities/roles/api/endpoints";
import type { UserUpdateContext } from "@/entities/users/lib/refresh-selected-user";
import { useRoles } from "@/entities/users/model/store";
import { useListSchoolsQuery } from "@/entities/school/model/useListSchoolsQuery";
import type { School } from "@/entities/school/model/useListSchoolsQuery";
import { UserDetailHeader } from "@/app/(main)/admin/users/components/user-detail-drawer/user-detail-header";
import { UserDetailSidebar } from "@/app/(main)/admin/users/components/user-detail-drawer/user-detail-sidebar";
import { SchoolRoleAssignmentDialog } from "@/app/(main)/admin/users/components/user-detail-drawer/school-role-assignment-dialog";
import { UserDetailsCard } from "@/app/(main)/admin/users/components/user-detail-drawer/user-details-card";
import { UserPositionsTab } from "@/app/(main)/admin/users/components/user-detail-drawer/user-positions-tab";
import { UserClassesTab } from "@/app/(main)/admin/users/components/user-detail-drawer/user-classes-tab";
import { extractSchoolMetadata } from "@/app/(main)/admin/users/components/user-detail-drawer/utils";
import { useCanEditSchoolRoles } from "@/hooks/use-can-edit-school-roles";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { getDisplayName } from "@/app/(main)/admin/users/components/user-detail-drawer/utils";
import type { TabType } from "@/app/(main)/admin/users/components/user-detail-drawer/types";
import { apiFetch } from "@/lib/api/fetcher.client";

interface SchoolSettingsUserDetailDrawerProps {
  user: UserWithRolesAndSchools | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  onUserUpdate?: (context?: UserUpdateContext) => void | Promise<void>;
}

export function SchoolSettingsUserDetailDrawer({
  user,
  open,
  onOpenChange,
  schoolId,
  onUserUpdate,
}: SchoolSettingsUserDetailDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const VALID_TABS: TabType[] = ["details", "roles", "positions", "classes"];
  const tabFromUrl = searchParams?.get("tab") || "details";
  const activeTab: TabType = VALID_TABS.includes(tabFromUrl as TabType)
    ? (tabFromUrl as TabType)
    : "details";
  const updateTab = (tab: TabType) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("tab", tab);
    if (params.get("id")) {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };
  const [editSchoolRolesDialogOpen, setEditSchoolRolesDialogOpen] =
    useState(false);
  const [editSchoolRolesSelected, setEditSchoolRolesSelected] = useState<
    Set<string>
  >(new Set());
  const [isSavingEditSchoolRoles, setIsSavingEditSchoolRoles] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [isRemovingUser, setIsRemovingUser] = useState(false);
  const [removeUserError, setRemoveUserError] = useState<string | null>(null);

  const { roles } = useRoles();
  const { data: schools = [] } = useListSchoolsQuery({ limit: 100 });
  const { canEdit: canEditSchoolRoles } = useCanEditSchoolRoles(schoolId);
  const adminUsersAccess = useFeatureAccess("/admin/users");

  const staffRole = useMemo(
    () => roles.find((r) => r.key === "SCHOOL_STAFF"),
    [roles]
  );
  const adminRole = useMemo(
    () => roles.find((r) => r.key === "SCHOOL_ADMIN"),
    [roles]
  );
  const teacherRole = useMemo(
    () => roles.find((r) => r.key === "TEACHER"),
    [roles]
  );

  const schoolRolesAtThisSchool = useMemo(() => {
    if (!user) return [];
    return user.schoolRoles.filter(
      (sr) => sr.schoolId === schoolId && sr.roleKey !== "SCHOOL_LICENCE"
    );
  }, [user, schoolId]);

  const school = useMemo(
    () => schools.find((s) => s.id === schoolId),
    [schools, schoolId]
  );
  const schoolName = school?.name ?? schoolRolesAtThisSchool[0]?.schoolName ?? "School";

  const handleOpenEditSchoolRoles = () => {
    const roleOrder = ["SCHOOL_STAFF", "SCHOOL_ADMIN", "TEACHER"];
    const assignedRoleKeys = new Set(
      schoolRolesAtThisSchool.map((sr) => sr.roleKey || "").filter(Boolean)
    );
    const selectedRoleIds = new Set<string>();
    roleOrder.forEach((roleKey) => {
      if (assignedRoleKeys.has(roleKey)) {
        const role = roles.find((r) => r.key === roleKey);
        if (role) selectedRoleIds.add(role.id);
      }
    });
    setEditSchoolRolesSelected(selectedRoleIds);
    setEditSchoolRolesDialogOpen(true);
  };

  const removeAllRolesAtSchool = async () => {
    if (!user) return;
    const rolesToRemove = user.schoolRoles.filter(
      (sr) => sr.schoolId === schoolId
    );
    for (const schoolRole of rolesToRemove) {
      const roleToDelete = roles.find((r) => r.key === schoolRole.roleKey);
      if (roleToDelete) {
        await rolesApi.delete.removeRole({
          userId: user.id,
          roleId: roleToDelete.id,
          schoolId,
        });
      }
    }
  };

  const handleRemoveFromSchoolInEditDialog = async () => {
    if (!user || !staffRole) return;

    try {
      setIsSavingEditSchoolRoles(true);
      await removeAllRolesAtSchool();
      setEditSchoolRolesDialogOpen(false);
      setEditSchoolRolesSelected(new Set());
      await onUserUpdate?.({ removedSchoolId: schoolId });
    } catch (err) {
      console.error("Failed to remove user from school:", err);
    } finally {
      setIsSavingEditSchoolRoles(false);
    }
  };

  const applyEditSchoolRolesChanges = async () => {
    if (!user || !staffRole || !adminRole || !teacherRole) return;

    const roleOrder = [staffRole, adminRole, teacherRole];
    const currentRoleKeys = new Set(
      user.schoolRoles
        .filter((sr) => sr.schoolId === schoolId)
        .map((sr) => sr.roleKey || "")
        .filter((key) =>
          ["SCHOOL_STAFF", "SCHOOL_ADMIN", "TEACHER"].includes(key)
        )
    );
    const selectedRoleKeys = new Set<string>();
    roleOrder.forEach((r) => {
      if (editSchoolRolesSelected.has(r.id)) {
        selectedRoleKeys.add(r.key || "");
      }
    });

    const removingFromSchool = !editSchoolRolesSelected.has(staffRole.id);

    try {
      setIsSavingEditSchoolRoles(true);

      if (removingFromSchool) {
        await removeAllRolesAtSchool();
      } else {
        for (const role of roleOrder) {
          const roleKey = role.key || "";
          const shouldHave = selectedRoleKeys.has(roleKey);
          const hasRole = currentRoleKeys.has(roleKey);

          if (shouldHave && !hasRole) {
            await rolesApi.post.assignRole({
              userId: user.id,
              roleId: role.id,
              schoolId,
            });
            if (
              (roleKey === "TEACHER" || roleKey === "SCHOOL_ADMIN") &&
              !selectedRoleKeys.has("SCHOOL_STAFF") &&
              !currentRoleKeys.has("SCHOOL_STAFF")
            ) {
              await rolesApi.post.assignRole({
                userId: user.id,
                roleId: staffRole.id,
                schoolId,
              });
            }
          } else if (!shouldHave && hasRole) {
            await rolesApi.delete.removeRole({
              userId: user.id,
              roleId: role.id,
              schoolId,
            });
            if (
              (roleKey === "TEACHER" || roleKey === "SCHOOL_ADMIN") &&
              !selectedRoleKeys.has("TEACHER") &&
              !selectedRoleKeys.has("SCHOOL_ADMIN") &&
              !selectedRoleKeys.has("SCHOOL_STAFF")
            ) {
              const hasStaff = user.schoolRoles.some(
                (sr) =>
                  sr.roleKey === "SCHOOL_STAFF" && sr.schoolId === schoolId
              );
              if (hasStaff) {
                await rolesApi.delete.removeRole({
                  userId: user.id,
                  roleId: staffRole.id,
                  schoolId,
                });
              }
            }
          }
        }
      }

      setEditSchoolRolesDialogOpen(false);
      setEditSchoolRolesSelected(new Set());
      await onUserUpdate?.(
        removingFromSchool ? { removedSchoolId: schoolId } : undefined
      );
    } catch (err) {
      console.error("Failed to save school roles:", err);
    } finally {
      setIsSavingEditSchoolRoles(false);
    }
  };

  const handleRemoveUserFromSchool = async () => {
    if (!user) return;

    setIsRemovingUser(true);
    setRemoveUserError(null);

    try {
      const result = await apiFetch<{
        success: boolean;
        removed: number;
        failed: number;
      }>(`/schools/${schoolId}/users/remove`, {
        method: "POST",
        body: JSON.stringify({ userIds: [user.id] }),
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to remove user from school");
      }

      setRemoveConfirmOpen(false);
      onUserUpdate?.();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error("[REMOVE USER FROM SCHOOL] Error:", err);
      setRemoveUserError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsRemovingUser(false);
    }
  };

  if (!user) {
    return null;
  }

  const { stateText, sectorText, levelsText } = extractSchoolMetadata(
    school ?? null
  );
  const metadataParts = [stateText, sectorText, levelsText].filter(Boolean);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[95vh] w-full max-w-4xl mx-auto rounded-t-2xl border-t-2 border-l-2 border-r-2 border-border/50 shadow-2xl p-0 gap-2 overflow-hidden flex flex-col"
      >
        <SheetTitle className="sr-only">
          {getDisplayName(user)} - User Details
        </SheetTitle>

        <UserDetailHeader user={user} />
        <div className="flex flex-1 overflow-hidden min-h-0 gap-0">
          <UserDetailSidebar
            activeTab={activeTab}
            onTabChange={updateTab}
            visibleTabs={["details", "roles", "positions", "classes"]}
            dangerAction={
              canEditSchoolRoles
                ? {
                    label: "Remove user",
                    onClick: () => {
                      setRemoveUserError(null);
                      setRemoveConfirmOpen(true);
                    },
                  }
                : undefined
            }
          />
          <main className="flex flex-1 flex-col overflow-hidden min-h-0 pt-2 pr-6 pl-4">
            <div className="flex-1 overflow-y-auto">
              {activeTab === "details" && (
                <UserDetailsCard
                  user={user}
                  onUserUpdate={onUserUpdate}
                  canEdit={adminUsersAccess.hasAccess}
                />
              )}

              {activeTab === "roles" && (
                <div className="space-y-4">
                  {/* School roles for this school only */}
                  <Card className="border py-1">
                    <CardContent className="px-4 py-2 flex items-center justify-between gap-4">
                      <div className="flex flex-col -space-y-0.5 shrink-0">
                        <h3 className="text-lg font-semibold">{schoolName}</h3>
                        {metadataParts.length > 0 && (
                          <div className="flex items-center gap-1 text-muted-foreground text-[0.65rem]">
                            {metadataParts.map((part, index) => (
                              <div key={index} className="flex items-center gap-1">
                                <div className="truncate capitalize">{part}</div>
                                {index < metadataParts.length - 1 && (
                                  <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap justify-end">
                        <RoleBadges
                          roles={schoolRolesAtThisSchool.map((r) => ({
                            roleKey: r.roleKey || "",
                            roleName: r.roleName || undefined,
                          }))}
                          variant="joined"
                          size="sm"
                        />
                        {canEditSchoolRoles && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOpenEditSchoolRoles}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {schoolRolesAtThisSchool.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No roles at this school
                    </p>
                  )}
                </div>
              )}

              {activeTab === "positions" && (
                <UserPositionsTab
                  user={user}
                  schools={schools}
                  scopedSchoolId={schoolId}
                  canEdit={canEditSchoolRoles}
                />
              )}

              {activeTab === "classes" && (
                <UserClassesTab
                  user={user}
                  schools={schools}
                  scopedSchoolId={schoolId}
                  canEdit={canEditSchoolRoles}
                />
              )}
            </div>
          </main>
        </div>
      </SheetContent>

      <SchoolRoleAssignmentDialog
        mode="edit"
        open={editSchoolRolesDialogOpen}
        onOpenChange={setEditSchoolRolesDialogOpen}
        title="Edit Access Levels"
        description="Edit roles for this user at your school."
        schools={
          school
            ? [school]
            : [{ id: schoolId, name: schoolName } as School]
        }
        initialSchoolId={schoolId}
        initialSchoolName={schoolName}
        selectedSchoolId={schoolId}
        onSchoolIdChange={() => {}}
        roles={roles.filter((r) =>
          ["SCHOOL_STAFF", "SCHOOL_ADMIN", "TEACHER"].includes(r.key || "")
        )}
        selectedRoleIds={editSchoolRolesSelected}
        onRoleIdsChange={setEditSchoolRolesSelected}
        onSubmit={applyEditSchoolRolesChanges}
        onRemoveFromSchool={handleRemoveFromSchoolInEditDialog}
        onCancel={() => {
          setEditSchoolRolesDialogOpen(false);
          setEditSchoolRolesSelected(new Set());
        }}
        isSaving={isSavingEditSchoolRoles}
      />

      <AlertDialog
        open={removeConfirmOpen}
        onOpenChange={(open) => {
          setRemoveConfirmOpen(open);
          if (!open) {
            setRemoveUserError(null);
            setIsRemovingUser(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`Remove user from ${schoolName}`}</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this user&apos;s roles, positions, and class
              associations for this school.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {removeUserError && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{removeUserError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingUser}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRemoveUserFromSchool();
              }}
              disabled={isRemovingUser}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isRemovingUser ? "Removing..." : "Remove user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
