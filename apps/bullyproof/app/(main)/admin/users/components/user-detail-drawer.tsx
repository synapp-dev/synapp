"use client";

import type { RoleRow } from "@/types/db";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
} from "@workspace/ui/components/sidebar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { Label } from "@workspace/ui/components/label";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Skeleton } from "@workspace/ui/components/skeleton";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
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
  meApi,
  type UserWithRolesAndSchools,
} from "@/entities/me/api/endpoints";
import { rolesApi } from "@/entities/roles/api/endpoints";
import { schoolApi } from "@/entities/school/api/endpoints";
import { usersApi } from "@/entities/users/api/endpoints";
import { useRoles } from "@/entities/users/model/store";
import { useListSchoolsQuery } from "@/entities/school/model/useListSchoolsQuery";
import type { School } from "@/entities/school/model/useListSchoolsQuery";
import {
  User,
  Mail,
  Calendar,
  ShieldCheck,
  Users as UsersIcon,
  Settings,
  Loader2,
  FileBadge2,
  Trash2,
  AlertCircle,
  Pencil,
  Save,
  History,
  School as SchoolIcon,
  X,
  UserPlus,
} from "lucide-react";

// Import extracted components and utilities
import { UserDetailHeader } from "./user-detail-drawer/user-detail-header";
import { UserDetailSidebar } from "./user-detail-drawer/user-detail-sidebar";
import { SchoolRoleAssignmentDialog } from "./user-detail-drawer/school-role-assignment-dialog";
import { PlatformRoleSwapDialog } from "./user-detail-drawer/platform-role-swap-dialog";
import { UserDetailsCard } from "./user-detail-drawer/user-details-card";
import { UserHistoryTab } from "./user-detail-drawer/user-history-tab";
import { UserPositionsTab } from "./user-detail-drawer/user-positions-tab";
import { UserClassesTab } from "./user-detail-drawer/user-classes-tab";
import { UserFeaturesTab } from "./user-detail-drawer/user-features-tab";
import {
  extractSchoolMetadata,
  getDisplayName,
  isSchoolLicenceAccount,
  PLATFORM_ROLE_KEYS,
  canTargetReceiveFirstPlatformRole,
} from "./user-detail-drawer/utils";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { useMeStore } from "@/entities/me/model/store";
import {
  canManageIntradarkDevScopedUser,
  profileHasIntradarkDevPlatformRole,
} from "@/lib/intradark-dev-protection";
import type {
  UserDetailDrawerProps,
  TabType,
  HistorySubTabType,
} from "./user-detail-drawer/types";

type Role = RoleRow;

function UserDetailDrawerContent({
  user,
  open,
  onOpenChange,
  onUserUpdate,
  onDeleteUserClick,
}: UserDetailDrawerProps) {
  // Use React Query hooks with Zustand caching for roles and schools
  const { roles, isLoading: loadingRoles } = useRoles();
  const { data: schools = [], isLoading: loadingSchools } = useListSchoolsQuery(
    { limit: 100 },
  );
  // Removed: editing state moved to UserDetailsCard component

  // Remove role dialog state
  const [isRemoveRoleDialogOpen, setIsRemoveRoleDialogOpen] = useState(false);
  const [roleToRemove, setRoleToRemove] = useState<{
    roleId: string;
    roleKey: string;
    roleName: string;
    schoolId?: string;
    schoolName?: string;
    isPlatform: boolean;
  } | null>(null);
  const [isRemovingRole, setIsRemovingRole] = useState(false);
  const [toggleRoleError, setToggleRoleError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Add role dialog state
  const [isAddRoleDialogOpen, setIsAddRoleDialogOpen] = useState(false);
  const [addRoleSchoolId, setAddRoleSchoolId] = useState<string>("");
  const [addRoleSelectedRoles, setAddRoleSelectedRoles] = useState<Set<string>>(
    new Set(),
  );
  const [isSavingRoles, setIsSavingRoles] = useState(false);
  const [isPlatformSwapOpen, setIsPlatformSwapOpen] = useState(false);

  // Memoize staff role ID to avoid unnecessary re-renders
  const staffRoleId = useMemo(() => {
    const staffRole = roles.find((r) => r.key === "SCHOOL_STAFF");
    return staffRole?.id;
  }, [roles]);

  // Reset selected roles when school is cleared
  useEffect(() => {
    if (!addRoleSchoolId) {
      setAddRoleSelectedRoles(new Set());
    }
  }, [addRoleSchoolId]);

  // Auto-add STAFF role when school is selected
  useEffect(() => {
    if (addRoleSchoolId && staffRoleId) {
      setAddRoleSelectedRoles((prev) => {
        // Only update if staff role is not already in the set
        if (prev.has(staffRoleId)) {
          return prev;
        }
        const newSet = new Set(prev);
        newSet.add(staffRoleId);
        return newSet;
      });
    }
  }, [addRoleSchoolId, staffRoleId]);

  // Edit school roles dialog state
  const [editSchoolRolesDialogOpen, setEditSchoolRolesDialogOpen] =
    useState(false);
  const [editSchoolRolesSchoolId, setEditSchoolRolesSchoolId] = useState<
    string | null
  >(null);
  const [editSchoolRolesSchoolName, setEditSchoolRolesSchoolName] =
    useState<string>("");
  const [editSchoolRolesSelected, setEditSchoolRolesSelected] = useState<
    Set<string>
  >(new Set());
  const [isSavingEditSchoolRoles, setIsSavingEditSchoolRoles] = useState(false);

  // Toggle role confirmation dialog
  const [isToggleRoleDialogOpen, setIsToggleRoleDialogOpen] = useState(false);
  const [roleToToggle, setRoleToToggle] = useState<{
    roleId: string;
    roleKey: string;
    roleName: string;
    schoolId?: string;
    schoolName?: string;
    isAdding: boolean;
    willRemoveAll?: boolean;
    isPlatform?: boolean;
  } | null>(null);
  const [isTogglingRole, setIsTogglingRole] = useState(false);

  // Check if current user has access to manage features
  const { hasAccess: canManageFeatures } = useFeatureAccess("/admin/features");

  const realViewer = useMeStore((s) => s.currentUser);
  const canMutateTargetUser = useMemo(
    () =>
      !user
        ? true
        : canManageIntradarkDevScopedUser(
            realViewer?.platformRoles,
            user.platformRoles,
          ),
    [realViewer?.platformRoles, user],
  );

  const viewerIsIntradarkDev = useMemo(
    () => profileHasIntradarkDevPlatformRole(realViewer?.platformRoles),
    [realViewer?.platformRoles],
  );

  const allowSchoolOrPlatformAddTab = useMemo(
    () =>
      Boolean(
        viewerIsIntradarkDev && user && canTargetReceiveFirstPlatformRole(user),
      ),
    [viewerIsIntradarkDev, user],
  );

  // Context-aware params: schools page uses "tab" for school section, so we use userTab/userHistoryTab
  const isSchoolsContext = pathname?.includes("/admin/schools") ?? false;
  const tabParam = isSchoolsContext ? "userTab" : "tab";
  const historyParam = isSchoolsContext ? "userHistoryTab" : "historyTab";
  const VALID_TAB_TYPES: TabType[] = [
    "details",
    "roles",
    "positions",
    "classes",
    "history",
    "features",
  ];
  const VALID_HISTORY_SUB_TABS: HistorySubTabType[] = ["details", "roles"];

  // Get active tab from query params - validate and default to "details" if invalid
  const rawTab = searchParams.get(tabParam) as TabType | null;
  const activeTab =
    rawTab && VALID_TAB_TYPES.includes(rawTab) ? rawTab : "details";
  const rawHistoryTab = searchParams.get(
    historyParam,
  ) as HistorySubTabType | null;
  const historySubTab =
    rawHistoryTab && VALID_HISTORY_SUB_TABS.includes(rawHistoryTab)
      ? rawHistoryTab
      : "details";

  // Params to exclude when preserving (we overwrite these for user drawer)
  const excludeKeys = isSchoolsContext
    ? ["id", "userTab", "userHistoryTab"]
    : ["id", "tab", "historyTab"];

  // Simple function to update query params - buttons only call this
  const updateTab = (tab: TabType) => {
    const userId = searchParams.get("id");
    const params = new URLSearchParams();

    // Preserve all params except user drawer ones
    for (const [key, value] of searchParams.entries()) {
      if (!excludeKeys.includes(key)) {
        params.set(key, value);
      }
    }

    if (userId) {
      params.set("id", userId);
    }
    params.set(tabParam, tab);

    if (tab === "history") {
      const currentHistoryTab = searchParams.get(historyParam) || "details";
      params.set(historyParam, currentHistoryTab);
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Simple function to update history sub-tab - buttons only call this
  const updateHistorySubTab = (subTab: "details" | "roles") => {
    const userId = searchParams.get("id");
    const params = new URLSearchParams();

    // Preserve all params except user drawer ones
    for (const [key, value] of searchParams.entries()) {
      if (!excludeKeys.includes(key)) {
        params.set(key, value);
      }
    }

    if (userId) {
      params.set("id", userId);
    }
    params.set(tabParam, "history");
    params.set(historyParam, subTab);

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [updateLogUsers, setUpdateLogUsers] = useState<
    Record<
      string,
      {
        firstName: string | null;
        lastName: string | null;
        email: string;
      } | null
    >
  >({});

  // Roles are now loaded via useRoles hook with caching

  // Schools are now loaded via useListSchoolsQuery hook with caching

  // Removed: form initialization moved to UserDetailsCard component

  // Fetch user details for update logs and role logs
  useEffect(() => {
    if (!user?.metadata) {
      return;
    }

    const fetchUpdateLogUsers = async () => {
      const uniqueUserIds = new Set<string>();

      // Collect user IDs from update logs
      if (user.metadata.updateLogs && Array.isArray(user.metadata.updateLogs)) {
        user.metadata.updateLogs.forEach((log: any) => {
          if (log.updatedBy) {
            uniqueUserIds.add(log.updatedBy);
          }
        });
      }

      // Collect user IDs from role logs
      if (user.metadata.roleLogs && Array.isArray(user.metadata.roleLogs)) {
        user.metadata.roleLogs.forEach((log: any) => {
          if (log.updatedBy) {
            uniqueUserIds.add(log.updatedBy);
          }
        });
      }

      // Filter out user IDs we already have
      const userIdsToFetch = Array.from(uniqueUserIds).filter(
        (userId) => !updateLogUsers[userId],
      );

      if (userIdsToFetch.length === 0) {
        return;
      }

      const userPromises = userIdsToFetch.map(async (userId) => {
        try {
          const result = await meApi.get.userById(userId);
          if (result.data) {
            return {
              userId,
              user: {
                firstName: result.data.firstName,
                lastName: result.data.lastName,
                email: result.data.email,
              },
            };
          }
        } catch (err) {
          console.error(`Failed to fetch user ${userId}:`, err);
        }
        return null;
      });

      const results = await Promise.all(userPromises);
      const newUsers: Record<
        string,
        {
          firstName: string | null;
          lastName: string | null;
          email: string;
        } | null
      > = {};

      results.forEach((result) => {
        if (result) {
          newUsers[result.userId] = result.user;
        }
      });

      if (Object.keys(newUsers).length > 0) {
        setUpdateLogUsers((prev) => ({ ...prev, ...newUsers }));
      }
    };

    fetchUpdateLogUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.metadata?.updateLogs, user?.metadata?.roleLogs]);

  // Removed: hasChanges check moved to UserDetailsCard component

  // Check if user has any platform role
  const userHasPlatformRole =
    user?.platformRoles?.some((key) => PLATFORM_ROLE_KEYS.includes(key)) ??
    false;

  // Check if user has any school role
  const userHasSchoolRole = (user?.schoolRoles?.length ?? 0) > 0;

  // Check if user has SCHOOL_LICENCE role
  const userHasSchoolLicence = user ? isSchoolLicenceAccount(user) : false;

  // Check if user has any non-SCHOOL_LICENCE school roles
  const userHasNonLicenceSchoolRole =
    user?.schoolRoles?.some((sr) => sr.roleKey !== "SCHOOL_LICENCE") ?? false;

  // Get the platform role name for display (if user has one)
  const userPlatformRoleKey = user?.platformRoles?.find((key) =>
    PLATFORM_ROLE_KEYS.includes(key),
  );
  const platformRole = userPlatformRoleKey
    ? roles.find((r) => r.key === userPlatformRoleKey)
    : null;
  const platformRoleName = platformRole?.name || "Platform Role";

  const handleRemoveRoleClick = (
    roleKey: string,
    roleName: string,
    isPlatform: boolean,
    schoolId?: string,
    schoolName?: string,
  ) => {
    if (!user) return;

    const role = roles.find((r) => r.key === roleKey);
    if (!role) {
      alert("Role not found");
      return;
    }

    setRoleToRemove({
      roleId: role.id,
      roleKey,
      roleName,
      schoolId,
      schoolName,
      isPlatform,
    });
    setIsRemoveRoleDialogOpen(true);
  };

  const handleToggleRole = async () => {
    if (!user || !roleToToggle || !canMutateTargetUser) {
      setIsTogglingRole(false);
      return;
    }

    // Store roleToToggle in a local variable to avoid null issues
    const role = roleToToggle;

    try {
      setIsTogglingRole(true);
      setToggleRoleError(null);

      if (role.isAdding) {
        // Assign role
        const result = await rolesApi.post.assignRole({
          userId: user.id,
          roleId: roleToToggle.roleId,
          schoolId: roleToToggle.schoolId,
        });

        if (result.error) {
          const errorMessage = result.error.message || "Failed to assign access level";
          setToggleRoleError(errorMessage);
          setIsTogglingRole(false);
          return;
        }

        // Auto-add STAFF if assigning TEACHER or SCHOOL_ADMIN (only for school roles)
        if (
          !role.isPlatform &&
          (role.roleKey === "TEACHER" || role.roleKey === "SCHOOL_ADMIN") &&
          role.schoolId
        ) {
          const staffRole = roles.find((r) => r.key === "SCHOOL_STAFF");
          if (staffRole) {
            // Check if user already has STAFF at this school
            const hasStaffAtSchool = user.schoolRoles.some(
              (sr) =>
                sr.roleKey === "SCHOOL_STAFF" && sr.schoolId === role.schoolId,
            );
            if (!hasStaffAtSchool) {
              await rolesApi.post.assignRole({
                userId: user.id,
                roleId: staffRole.id,
                schoolId: role.schoolId,
              });
            }
          }
        }
      } else {
        // Remove role
        const roleToRemove = roles.find((r) => r.id === role.roleId);
        if (!roleToRemove) {
          setToggleRoleError("Role not found");
          setIsTogglingRole(false);
          return;
        }

        // Platform roles: remove directly without schoolId
        if (role.isPlatform) {
          const result = await rolesApi.delete.removeRole({
            userId: user.id,
            roleId: role.roleId,
            schoolId: undefined,
          });

          if (result.error) {
            const errorMessage =
              result.error.message || "Failed to remove access level";
            setToggleRoleError(errorMessage);
            setIsTogglingRole(false);
            return;
          }
        } else {
          // School roles: handle STAFF removal logic
          // If removing STAFF and user has TEACHER or SCHOOL_ADMIN, remove all roles
          if (role.willRemoveAll && role.schoolId) {
            const rolesToRemove = user.schoolRoles.filter(
              (sr) => sr.schoolId === role.schoolId,
            );
            for (const schoolRole of rolesToRemove) {
              const roleToDelete = roles.find(
                (r) => r.key === schoolRole.roleKey,
              );
              if (roleToDelete) {
                await rolesApi.delete.removeRole({
                  userId: user.id,
                  roleId: roleToDelete.id,
                  schoolId: role.schoolId,
                });
              }
            }
          } else {
            // Remove single role
            const result = await rolesApi.delete.removeRole({
              userId: user.id,
              roleId: role.roleId,
              schoolId: role.schoolId,
            });

            if (result.error) {
              const errorMessage =
                result.error.message || "Failed to remove access level";
              setToggleRoleError(errorMessage);
              setIsTogglingRole(false);
              return;
            }

            // If removing TEACHER or SCHOOL_ADMIN, also remove STAFF if no other non-staff roles remain
            if (role.roleKey === "TEACHER" || role.roleKey === "SCHOOL_ADMIN") {
              const remainingRoles = user.schoolRoles.filter(
                (sr) =>
                  sr.schoolId === role.schoolId && sr.roleKey !== role.roleKey,
              );
              const hasOtherNonStaffRoles = remainingRoles.some(
                (sr) =>
                  sr.roleKey === "TEACHER" || sr.roleKey === "SCHOOL_ADMIN",
              );
              if (!hasOtherNonStaffRoles) {
                const staffRole = roles.find((r) => r.key === "SCHOOL_STAFF");
                if (staffRole) {
                  const hasStaff = remainingRoles.some(
                    (sr) => sr.roleKey === "SCHOOL_STAFF",
                  );
                  if (hasStaff) {
                    await rolesApi.delete.removeRole({
                      userId: user.id,
                      roleId: staffRole.id,
                      schoolId: role.schoolId,
                    });
                  }
                }
              }
            }
          }
        }
      }

      // Close dialog first (but keep roleToToggle for loader)
      setIsToggleRoleDialogOpen(false);
      const toggledRole = role;

      // Refresh user data
      onUserUpdate?.();

      // Clear loading state after refresh completes
      setIsTogglingRole(false);
      setRoleToToggle(null);
    } catch (err: any) {
      console.error("Failed to update access level:", err);
      const errorMessage = err.message || "Failed to update access level";
      setToggleRoleError(errorMessage);
      setIsTogglingRole(false);
      // Keep roleToToggle set on error so user can see which one failed
      // It will be cleared when dialog is closed or user tries again
    }
  };

  const handleRemoveRole = async () => {
    if (!user || !roleToRemove || !canMutateTargetUser) return;

    try {
      setIsRemovingRole(true);
      const result = await rolesApi.delete.removeRole({
        userId: user.id,
        roleId: roleToRemove.roleId,
        schoolId: roleToRemove.schoolId,
      });

      if (result.error) {
        alert(result.error.message || "Failed to remove access level");
        return;
      }

      // Close dialog and reset state
      setIsRemoveRoleDialogOpen(false);
      setRoleToRemove(null);

      // Refresh user data
      onUserUpdate?.();
    } catch (err: any) {
      console.error("Failed to remove access level:", err);
      alert(err.message || "Failed to remove access level");
    } finally {
      setIsRemovingRole(false);
    }
  };

  const handleSaveRolesFromDialog = async () => {
    if (
      !user ||
      !addRoleSchoolId ||
      addRoleSelectedRoles.size === 0 ||
      !canMutateTargetUser
    ) {
      return;
    }

    try {
      setIsSavingRoles(true);
      setToggleRoleError(null);

      // Get school roles (STAFF, TEACHER, SCHOOL_ADMIN)
      const schoolRoles = roles.filter((role) => {
        const roleKey = role.key || "";
        return (
          roleKey === "TEACHER" ||
          roleKey === "SCHOOL_ADMIN" ||
          roleKey === "SCHOOL_STAFF"
        );
      });

      const staffRole = schoolRoles.find((r) => r.key === "SCHOOL_STAFF");
      const selectedRoleIds = Array.from(addRoleSelectedRoles);

      // Ensure STAFF is always included (it should be, but just in case)
      if (staffRole && !selectedRoleIds.includes(staffRole.id)) {
        selectedRoleIds.push(staffRole.id);
      }

      // Assign all selected roles
      for (const roleId of selectedRoleIds) {
        const role = roles.find((r) => r.id === roleId);
        if (!role) continue;

        // Check if user already has this role at this school
        const hasRole = user.schoolRoles.some(
          (sr) => sr.roleKey === role.key && sr.schoolId === addRoleSchoolId,
        );

        if (!hasRole) {
          const result = await rolesApi.post.assignRole({
            userId: user.id,
            roleId: roleId,
            schoolId: addRoleSchoolId,
          });

          if (result.error) {
            const errorMessage =
              result.error.message || "Failed to assign access level";
            setToggleRoleError(errorMessage);
            setIsSavingRoles(false);
            return;
          }

          // Auto-add STAFF if assigning TEACHER or SCHOOL_ADMIN
          if (
            staffRole &&
            (role.key === "TEACHER" || role.key === "SCHOOL_ADMIN") &&
            !addRoleSelectedRoles.has(staffRole.id)
          ) {
            const hasStaffAtSchool = user.schoolRoles.some(
              (sr) =>
                sr.roleKey === "SCHOOL_STAFF" &&
                sr.schoolId === addRoleSchoolId,
            );
            if (!hasStaffAtSchool) {
              await rolesApi.post.assignRole({
                userId: user.id,
                roleId: staffRole.id,
                schoolId: addRoleSchoolId,
              });
            }
          }
        }
      }

      // Close dialog and reset state
      setIsAddRoleDialogOpen(false);
      setAddRoleSchoolId("");
      setAddRoleSelectedRoles(new Set());

      // Refresh user data
      onUserUpdate?.();
    } catch (err: any) {
      console.error("Failed to save access levels:", err);
      const errorMessage = err.message || "Failed to save access levels";
      setToggleRoleError(errorMessage);
    } finally {
      setIsSavingRoles(false);
    }
  };

  const handleAssignPlatformFromDialog = async (roleId: string) => {
    if (!user || !canMutateTargetUser) return;

    setIsSavingRoles(true);
    setToggleRoleError(null);
    try {
      const result = await rolesApi.post.assignRole({
        userId: user.id,
        roleId,
      });
      if (result.error) {
        setToggleRoleError(result.error.message || "Failed to assign access level");
        return;
      }
      setIsAddRoleDialogOpen(false);
      setAddRoleSchoolId("");
      setAddRoleSelectedRoles(new Set());
      onUserUpdate?.();
    } catch (err: unknown) {
      console.error("Failed to assign platform role:", err);
      setToggleRoleError(
        err instanceof Error ? err.message : "Failed to assign access level",
      );
    } finally {
      setIsSavingRoles(false);
    }
  };

  const handleOpenEditSchoolRoles = (
    schoolId: string,
    schoolName: string,
    schoolRoles: Array<{ roleKey: string | null }>,
  ) => {
    const roleOrder = ["SCHOOL_STAFF", "SCHOOL_ADMIN", "TEACHER"];
    const assignedRoleKeys = new Set(
      schoolRoles.map((sr) => sr.roleKey || "").filter(Boolean),
    );
    const selectedRoleIds = new Set<string>();
    roleOrder.forEach((roleKey) => {
      if (assignedRoleKeys.has(roleKey)) {
        const role = roles.find((r) => r.key === roleKey);
        if (role) selectedRoleIds.add(role.id);
      }
    });
    setEditSchoolRolesSchoolId(schoolId);
    setEditSchoolRolesSchoolName(schoolName);
    setEditSchoolRolesSelected(selectedRoleIds);
    setEditSchoolRolesDialogOpen(true);
  };

  const removeAllRolesAtSchool = async (schoolId: string) => {
    if (!user || !canMutateTargetUser) return;
    const rolesToRemove = user.schoolRoles.filter(
      (sr) => sr.schoolId === schoolId,
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

  const closeEditSchoolRolesDialog = () => {
    setEditSchoolRolesDialogOpen(false);
    setEditSchoolRolesSchoolId(null);
    setEditSchoolRolesSchoolName("");
    setEditSchoolRolesSelected(new Set());
  };

  const handleRemoveFromSchoolInEditDialog = async () => {
    if (!user || !editSchoolRolesSchoolId || !canMutateTargetUser) return;

    try {
      setIsSavingEditSchoolRoles(true);
      await removeAllRolesAtSchool(editSchoolRolesSchoolId);
      closeEditSchoolRolesDialog();
      await onUserUpdate?.({ removedSchoolId: editSchoolRolesSchoolId });
    } catch (err: unknown) {
      console.error("Failed to remove user from school:", err);
    } finally {
      setIsSavingEditSchoolRoles(false);
    }
  };

  const applyEditSchoolRolesChanges = async () => {
    if (!user || !editSchoolRolesSchoolId || !canMutateTargetUser) return;

    const staffRole = roles.find((r) => r.key === "SCHOOL_STAFF");
    const adminRole = roles.find((r) => r.key === "SCHOOL_ADMIN");
    const teacherRole = roles.find((r) => r.key === "TEACHER");
    if (!staffRole || !adminRole || !teacherRole) return;

    const roleOrder = [staffRole, adminRole, teacherRole];
    const currentRoleKeys = new Set(
      user.schoolRoles
        .filter((sr) => sr.schoolId === editSchoolRolesSchoolId)
        .map((sr) => sr.roleKey || "")
        .filter((key) =>
          ["SCHOOL_STAFF", "SCHOOL_ADMIN", "TEACHER"].includes(key),
        ),
    );
    const selectedRoleKeys = new Set<string>();
    roleOrder.forEach((role) => {
      if (editSchoolRolesSelected.has(role.id)) {
        selectedRoleKeys.add(role.key || "");
      }
    });

    const removingFromSchool = !editSchoolRolesSelected.has(staffRole.id);

    try {
      setIsSavingEditSchoolRoles(true);

      if (removingFromSchool) {
        await removeAllRolesAtSchool(editSchoolRolesSchoolId);
      } else {
        for (const role of roleOrder) {
          const roleKey = role.key || "";
          const shouldHave = selectedRoleKeys.has(roleKey);
          const hasRole = currentRoleKeys.has(roleKey);

          if (shouldHave && !hasRole) {
            await rolesApi.post.assignRole({
              userId: user.id,
              roleId: role.id,
              schoolId: editSchoolRolesSchoolId,
            });
            if (
              (roleKey === "TEACHER" || roleKey === "SCHOOL_ADMIN") &&
              !selectedRoleKeys.has("SCHOOL_STAFF") &&
              !currentRoleKeys.has("SCHOOL_STAFF")
            ) {
              await rolesApi.post.assignRole({
                userId: user.id,
                roleId: staffRole.id,
                schoolId: editSchoolRolesSchoolId,
              });
            }
          } else if (!shouldHave && hasRole) {
            await rolesApi.delete.removeRole({
              userId: user.id,
              roleId: role.id,
              schoolId: editSchoolRolesSchoolId,
            });
            if (
              (roleKey === "TEACHER" || roleKey === "SCHOOL_ADMIN") &&
              !selectedRoleKeys.has("TEACHER") &&
              !selectedRoleKeys.has("SCHOOL_ADMIN") &&
              !selectedRoleKeys.has("SCHOOL_STAFF")
            ) {
              const hasStaff = user.schoolRoles.some(
                (sr) =>
                  sr.roleKey === "SCHOOL_STAFF" &&
                  sr.schoolId === editSchoolRolesSchoolId,
              );
              if (hasStaff) {
                await rolesApi.delete.removeRole({
                  userId: user.id,
                  roleId: staffRole.id,
                  schoolId: editSchoolRolesSchoolId,
                });
              }
            }
          }
        }
      }

      closeEditSchoolRolesDialog();
      await onUserUpdate?.(
        removingFromSchool
          ? { removedSchoolId: editSchoolRolesSchoolId }
          : undefined,
      );
    } catch (err: unknown) {
      console.error("Failed to save school roles:", err);
    } finally {
      setIsSavingEditSchoolRoles(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[95vh] w-full max-w-4xl mx-auto rounded-t-2xl border-t-2 border-l-2 border-r-2 border-border/50 shadow-2xl p-0 gap-2 overflow-hidden flex flex-col"
      >
        <SheetTitle className="sr-only">
          {getDisplayName(user)} - User Details
        </SheetTitle>

        {/* Full-width Header */}
        <UserDetailHeader user={user} />
        {/* Sidebar and Content Area */}
        <div className="flex flex-1 overflow-hidden min-h-0 gap-0">
          {/* Left Sidebar */}
          <UserDetailSidebar
            activeTab={activeTab}
            onTabChange={updateTab}
            canManageFeatures={canManageFeatures}
            onDeleteClick={canMutateTargetUser ? onDeleteUserClick : undefined}
          />

          {/* Right Content Area */}
          <main className="flex flex-1 flex-col overflow-hidden min-h-0 pt-2 pr-6 pl-4">
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "details" && (
                <UserDetailsCard
                  user={user}
                  onUserUpdate={onUserUpdate}
                  canEdit={canMutateTargetUser}
                />
              )}

              {activeTab === "roles" && (
                /* Roles */
                <div className="space-y-4">
                  {profileHasIntradarkDevPlatformRole(user.platformRoles) &&
                    !canMutateTargetUser && (
                      <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 w-full">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                        <AlertTitle className="text-amber-800 dark:text-amber-200">
                          Intradark developer account
                        </AlertTitle>
                        <AlertDescription className="text-amber-700 dark:text-amber-300">
                          This account can only be edited by users with the
                          Intradark developer role.
                        </AlertDescription>
                      </Alert>
                    )}
                  {/* Warning alerts */}
                  {(userHasPlatformRole ||
                    (userHasSchoolRole && !userHasPlatformRole)) && (
                    <>
                      {userHasPlatformRole && (
                        <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 w-full">
                          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                          <AlertTitle className="text-yellow-800 dark:text-yellow-200">
                            Platform Access Level Restriction
                          </AlertTitle>
                          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                            This user is a '{platformRoleName}' and can only
                            have one access level. They cannot have any other
                            access levels.
                          </AlertDescription>
                        </Alert>
                      )}
                      {userHasSchoolRole && !userHasPlatformRole && (
                        <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 w-full">
                          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                          <AlertTitle className="text-yellow-800 dark:text-yellow-200">
                            School Access Level Restriction
                          </AlertTitle>
                          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                            This user has school access levels and cannot have
                            platform access levels.
                          </AlertDescription>
                        </Alert>
                      )}
                      <Separator />
                    </>
                  )}

                  {/* Add New Role Button */}
                  {!userHasPlatformRole && (
                    <FeatureGuard feature="system:manage-user-roles">
                      <Button
                        onClick={() => {
                          setIsAddRoleDialogOpen(true);
                          setAddRoleSchoolId("");
                          setAddRoleSelectedRoles(new Set());
                        }}
                        variant="outline"
                        className="w-full md:w-auto"
                        disabled={!canMutateTargetUser}
                      >
                        <UserPlus className="h-4 w-4" />
                        Add New Access Level
                      </Button>
                    </FeatureGuard>
                  )}

                  {/* Platform Roles */}
                  {/* Only show platform card if user has platform roles AND no school roles */}
                  {userHasPlatformRole &&
                    !userHasSchoolRole &&
                    (() => {
                      const assignedPlatformRoleKeys = new Set(
                        user.platformRoles || [],
                      );

                      // Define platform role order
                      const platformRoleOrder = PLATFORM_ROLE_KEYS;

                      return (
                        <div className="space-y-2">
                          <Card className="border">
                            <CardContent className="px-4 py-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <h3 className="text-lg font-semibold">
                                  Platform
                                </h3>
                                {viewerIsIntradarkDev &&
                                  canMutateTargetUser && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        setIsPlatformSwapOpen(true)
                                      }
                                      className="h-8"
                                    >
                                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                      Change role
                                    </Button>
                                  )}
                              </div>

                              {/* All Platform Role Badges on Right */}
                              <div className="flex items-center gap-2 flex-wrap justify-end">
                                {platformRoleOrder.map((roleKey) => {
                                  const isAssigned =
                                    assignedPlatformRoleKeys.has(roleKey);
                                  const role = roles.find(
                                    (r) => r.key === roleKey,
                                  );

                                  if (!role) return null;

                                  const roleName = role.name || roleKey;

                                  const getBadgeClasses = (roleKey: string) => {
                                    if (roleKey === "PLATFORM_ADMIN") {
                                      return "!bg-[var(--role-platform-admin)] !text-[var(--role-platform-admin-text)] !border-[var(--role-platform-admin)]/50";
                                    }
                                    return "";
                                  };

                                  const getRoleColor = (roleKey: string) => {
                                    if (roleKey === "PLATFORM_ADMIN") {
                                      return "var(--role-platform-admin)";
                                    }
                                    return "var(--foreground)";
                                  };

                                  const roleColor = getRoleColor(roleKey);

                                  let RoleIcon = UsersIcon;
                                  if (roleKey === "PLATFORM_ADMIN") {
                                    RoleIcon = ShieldCheck;
                                  }

                                  if (isAssigned) {
                                    // Assigned role badge: Intradark dev uses "Change role" to swap; others click to remove
                                    return (
                                      <Badge
                                        key={`${roleKey}-platform-assigned`}
                                        variant="default"
                                        className={cn(
                                          "group flex items-center gap-1 border px-2 py-1 transition-colors",
                                          canMutateTargetUser &&
                                            !viewerIsIntradarkDev &&
                                            "cursor-pointer hover:!bg-destructive/10 hover:!text-destructive hover:!border-destructive/30",
                                          canMutateTargetUser &&
                                            viewerIsIntradarkDev &&
                                            "cursor-default",
                                          !canMutateTargetUser &&
                                            "cursor-not-allowed opacity-60",
                                          getBadgeClasses(roleKey),
                                        )}
                                        onClick={() => {
                                          if (
                                            !role ||
                                            !canMutateTargetUser ||
                                            viewerIsIntradarkDev
                                          )
                                            return;
                                          setRoleToToggle({
                                            roleId: role.id,
                                            roleKey,
                                            roleName,
                                            isAdding: false,
                                            isPlatform: true,
                                          });
                                          setIsToggleRoleDialogOpen(true);
                                        }}
                                      >
                                        <RoleIcon
                                          className={cn(
                                            "h-4 w-4",
                                            !viewerIsIntradarkDev &&
                                              "group-hover:hidden",
                                          )}
                                        />
                                        {!viewerIsIntradarkDev && (
                                          <X className="h-4 w-4 hidden group-hover:block !text-destructive" />
                                        )}
                                        {roleName}
                                      </Badge>
                                    );
                                  } else {
                                    // Unassigned role badge (dotted outline)
                                    // Don't show unassigned platform roles if user has school roles or already has a platform role
                                    if (
                                      userHasSchoolRole ||
                                      userHasPlatformRole
                                    )
                                      return null;

                                    return (
                                      <Badge
                                        key={`${roleKey}-platform-unassigned`}
                                        variant="outline"
                                        className={cn(
                                          "group flex items-center gap-1 border-dashed border px-2 py-1 transition-all bg-transparent text-muted-foreground border-muted-foreground",
                                          canMutateTargetUser &&
                                            "cursor-pointer hover:animate-pulse",
                                          !canMutateTargetUser &&
                                            "cursor-not-allowed opacity-60",
                                        )}
                                        onMouseEnter={(e) => {
                                          if (!canMutateTargetUser) return;
                                          e.currentTarget.style.backgroundColor =
                                            "rgba(217, 119, 6, 0.1)";
                                          e.currentTarget.style.color =
                                            roleColor;
                                          e.currentTarget.style.borderColor = `${roleColor}40`;
                                          const icon =
                                            e.currentTarget.querySelector(
                                              "svg",
                                            ) as SVGElement | null;
                                          if (icon) {
                                            icon.style.color = roleColor;
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!canMutateTargetUser) return;
                                          e.currentTarget.style.backgroundColor =
                                            "transparent";
                                          e.currentTarget.style.color = "";
                                          e.currentTarget.style.borderColor =
                                            "";
                                          const icon =
                                            e.currentTarget.querySelector(
                                              "svg",
                                            ) as SVGElement | null;
                                          if (icon) {
                                            icon.style.color = "";
                                          }
                                        }}
                                        onClick={() => {
                                          if (!canMutateTargetUser) return;
                                          setRoleToToggle({
                                            roleId: role.id,
                                            roleKey,
                                            roleName: role.name,
                                            isAdding: true,
                                            isPlatform: true,
                                          });
                                          setIsToggleRoleDialogOpen(true);
                                        }}
                                      >
                                        <RoleIcon
                                          className="h-4 w-4 text-muted-foreground transition-colors"
                                          style={{
                                            color: "inherit",
                                          }}
                                        />
                                        {role.name}
                                      </Badge>
                                    );
                                  }
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })()}

                  {/* School Roles - Grouped by School */}
                  {user.schoolRoles.length > 0 &&
                    (() => {
                      // Group school roles by schoolId
                      const rolesBySchool = new Map<
                        string,
                        Array<(typeof user.schoolRoles)[0]>
                      >();

                      user.schoolRoles.forEach((schoolRole) => {
                        const schoolId = schoolRole.schoolId || "unknown";
                        if (!rolesBySchool.has(schoolId)) {
                          rolesBySchool.set(schoolId, []);
                        }
                        rolesBySchool.get(schoolId)!.push(schoolRole);
                      });

                      // Sort school entries by creation date (oldest first)
                      // Schools without createdAt or not found will be sorted to the end
                      const schoolEntries = Array.from(
                        rolesBySchool.entries(),
                      ).sort(([schoolIdA], [schoolIdB]) => {
                        const schoolA = schools.find((s) => s.id === schoolIdA);
                        const schoolB = schools.find((s) => s.id === schoolIdB);

                        const createdAtA = schoolA?.createdAt
                          ? new Date(schoolA.createdAt).getTime()
                          : Number.MAX_SAFE_INTEGER;
                        const createdAtB = schoolB?.createdAt
                          ? new Date(schoolB.createdAt).getTime()
                          : Number.MAX_SAFE_INTEGER;

                        return createdAtA - createdAtB;
                      });

                      return (
                        <ScrollArea className="h-[400px] pr-4">
                          <div className="space-y-4">
                            {schoolEntries.map(([schoolId, schoolRoles]) => {
                              const schoolName =
                                schoolRoles[0]?.schoolName || "Unknown School";

                              const school = schools.find(
                                (s) => s.id === schoolId,
                              );
                              const { stateText, sectorText, levelsText } =
                                extractSchoolMetadata(school || null);
                              const metadataParts = [
                                stateText,
                                sectorText,
                                levelsText,
                              ].filter(Boolean);

                              return (
                                <div key={schoolId} className="space-y-2">
                                  <Card className="border py-1">
                                    <CardContent className="px-4 py-2 flex items-center justify-between gap-4">
                                      {/* School Title on Left */}
                                      <div className="flex flex-col -space-y-0.5 shrink-0">
                                        <h3 className="text-lg font-semibold">
                                          {schoolName}
                                        </h3>
                                        {metadataParts.length > 0 && (
                                          <div className="flex items-center gap-1 text-muted-foreground text-[0.65rem]">
                                            {metadataParts.map(
                                              (part, index) => (
                                                <div
                                                  key={index}
                                                  className="flex items-center gap-1"
                                                >
                                                  <div className="truncate capitalize">
                                                    {part}
                                                  </div>
                                                  {index <
                                                    metadataParts.length -
                                                      1 && (
                                                    <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                                                  )}
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {/* Role badges + separator + Edit button */}
                                      <div className="flex items-center gap-3 flex-wrap justify-end">
                                        {(() => {
                                          const getBadgeClasses = (
                                            roleKey: string,
                                          ) => {
                                            if (roleKey === "TEACHER") {
                                              return "bg-[var(--role-teacher)] text-[var(--role-teacher-text)] border-[var(--role-teacher)]/50";
                                            }
                                            if (roleKey === "SCHOOL_ADMIN") {
                                              return "bg-[var(--role-school-admin)] text-[var(--role-school-admin-text)] border-[var(--role-school-admin)]/50";
                                            }
                                            if (roleKey === "SCHOOL_STAFF") {
                                              return "bg-[var(--role-school-staff)] text-[var(--role-school-staff-text)] border-[var(--role-school-staff)]/50";
                                            }
                                            if (roleKey === "SCHOOL_LICENCE") {
                                              return "bg-[var(--role-school-licence)] text-[var(--role-school-licence-text)] border-[var(--role-school-licence)]/50";
                                            }
                                            return "";
                                          };

                                          const sortedRoles = [
                                            ...schoolRoles,
                                          ].sort((a, b) => {
                                            const order: Record<
                                              string,
                                              number
                                            > = {
                                              SCHOOL_STAFF: 1,
                                              SCHOOL_ADMIN: 2,
                                              TEACHER: 3,
                                              SCHOOL_LICENCE: 4,
                                            };
                                            return (
                                              (order[a.roleKey || ""] ?? 5) -
                                              (order[b.roleKey || ""] ?? 5)
                                            );
                                          });

                                          const roleCount = sortedRoles.length;

                                          return (
                                            <>
                                              <div className="flex items-center gap-0 flex-wrap">
                                                {sortedRoles.map(
                                                  (role, roleIdx) => {
                                                    const roleKey =
                                                      role.roleKey || "";
                                                    const badgeClasses =
                                                      getBadgeClasses(roleKey);
                                                    const isFirst =
                                                      roleIdx === 0;
                                                    const isLast =
                                                      roleIdx === roleCount - 1;
                                                    const isAdmin =
                                                      roleKey.includes("ADMIN");
                                                    let borderRadiusClass = "";
                                                    if (roleCount === 1) {
                                                      borderRadiusClass =
                                                        "rounded-md";
                                                    } else if (isFirst) {
                                                      borderRadiusClass =
                                                        "rounded-l-md rounded-r-none";
                                                    } else if (isLast) {
                                                      borderRadiusClass =
                                                        "rounded-r-md rounded-l-none";
                                                    } else {
                                                      borderRadiusClass =
                                                        "rounded-none";
                                                    }

                                                    return (
                                                      <Badge
                                                        key={`${roleKey}-${roleIdx}`}
                                                        variant="default"
                                                        className={cn(
                                                          "flex items-center gap-1 z-10 border px-2 py-1",
                                                          badgeClasses,
                                                          !isLast &&
                                                            "border-r-0 -mr-[1px]",
                                                          borderRadiusClass,
                                                        )}
                                                      >
                                                        {roleKey ===
                                                        "SCHOOL_LICENCE" ? (
                                                          <FileBadge2 className="h-3 w-3" />
                                                        ) : isAdmin ? (
                                                          <ShieldCheck className="h-3 w-3" />
                                                        ) : (
                                                          <UsersIcon className="h-3 w-3" />
                                                        )}
                                                        {role.roleName ||
                                                          roleKey}
                                                      </Badge>
                                                    );
                                                  },
                                                )}
                                              </div>
                                              <Separator
                                                orientation="vertical"
                                                className="h-6"
                                              />
                                              <FeatureGuard feature="system:manage-user-roles">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() =>
                                                    handleOpenEditSchoolRoles(
                                                      schoolId,
                                                      schoolName,
                                                      schoolRoles,
                                                    )
                                                  }
                                                  disabled={
                                                    userHasPlatformRole ||
                                                    !canMutateTargetUser
                                                  }
                                                >
                                                  <Pencil className="h-4 w-4" />
                                                  Edit
                                                </Button>
                                              </FeatureGuard>
                                            </>
                                          );
                                        })()}
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      );
                    })()}

                  {user.platformRoles.length === 0 &&
                    user.schoolRoles.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No roles assigned
                      </p>
                    )}
                </div>
              )}

              {activeTab === "positions" && (
                <UserPositionsTab
                  user={user}
                  schools={schools}
                  canEdit={canMutateTargetUser}
                />
              )}

              {activeTab === "classes" && (
                <UserClassesTab
                  user={user}
                  schools={schools}
                  canEdit={canMutateTargetUser}
                />
              )}

              {activeTab === "history" && (
                <UserHistoryTab
                  user={user}
                  historySubTab={historySubTab}
                  onHistorySubTabChange={updateHistorySubTab}
                  updateLogUsers={updateLogUsers}
                />
              )}

              {activeTab === "features" && (
                <FeatureGuard feature="/admin/features">
                  <UserFeaturesTab user={user} canEdit={canMutateTargetUser} />
                </FeatureGuard>
              )}
            </div>
          </main>
        </div>
      </SheetContent>

      {/* Remove Role Confirmation Dialog */}
      <AlertDialog
        open={isRemoveRoleDialogOpen}
        onOpenChange={setIsRemoveRoleDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the role{" "}
              <strong>{roleToRemove?.roleName}</strong>
              {roleToRemove?.schoolName && (
                <>
                  {" "}
                  from <strong>{roleToRemove.schoolName}</strong>
                </>
              )}{" "}
              from {getDisplayName(user)}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsRemoveRoleDialogOpen(false);
                setRoleToRemove(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveRole}
              disabled={isRemovingRole}
              className="bg-destructive text-secondary hover:bg-destructive/90 focus:ring-destructive"
            >
              {isRemovingRole ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Role"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit School Roles Dialog */}
      <SchoolRoleAssignmentDialog
        mode="edit"
        open={editSchoolRolesDialogOpen}
        onOpenChange={(open) => {
          setEditSchoolRolesDialogOpen(open);
          if (!open) {
            setEditSchoolRolesSchoolId(null);
            setEditSchoolRolesSchoolName("");
            setEditSchoolRolesSelected(new Set());
          }
        }}
        title={`Edit Access Levels for ${editSchoolRolesSchoolName || "School"}`}
        description="Manage roles at this school. Unchecking Staff will remove this user from the school entirely."
        schools={schools}
        initialSchoolId={editSchoolRolesSchoolId}
        initialSchoolName={editSchoolRolesSchoolName}
        selectedSchoolId={editSchoolRolesSchoolId ?? ""}
        onSchoolIdChange={() => {}}
        roles={roles}
        selectedRoleIds={editSchoolRolesSelected}
        onRoleIdsChange={setEditSchoolRolesSelected}
        onSubmit={applyEditSchoolRolesChanges}
        onRemoveFromSchool={handleRemoveFromSchoolInEditDialog}
        onCancel={() => {
          setEditSchoolRolesDialogOpen(false);
          setEditSchoolRolesSchoolId(null);
          setEditSchoolRolesSchoolName("");
          setEditSchoolRolesSelected(new Set());
        }}
        isSaving={isSavingEditSchoolRoles}
      />

      {/* Add Role Dialog */}
      <SchoolRoleAssignmentDialog
        mode="add"
        open={isAddRoleDialogOpen}
        onOpenChange={(open) => {
          setIsAddRoleDialogOpen(open);
          if (!open) {
            setAddRoleSchoolId("");
            setAddRoleSelectedRoles(new Set());
            setToggleRoleError(null);
          }
        }}
        title="Add Access Level"
        description={
          allowSchoolOrPlatformAddTab
            ? `Add school roles or assign a platform role to ${getDisplayName(user)}.`
            : `Select a school and assign roles to ${getDisplayName(user)}.`
        }
        schools={schools}
        selectedSchoolId={addRoleSchoolId}
        onSchoolIdChange={(id) => {
          setAddRoleSchoolId(id);
          setAddRoleSelectedRoles(new Set());
        }}
        roles={roles}
        selectedRoleIds={addRoleSelectedRoles}
        onRoleIdsChange={setAddRoleSelectedRoles}
        onSubmit={handleSaveRolesFromDialog}
        onCancel={() => {
          setIsAddRoleDialogOpen(false);
          setAddRoleSchoolId("");
          setAddRoleSelectedRoles(new Set());
          setToggleRoleError(null);
        }}
        isSaving={isSavingRoles}
        error={toggleRoleError}
        excludeSchoolIds={
          user
            ? new Set(user.schoolRoles?.map((sr) => sr.schoolId) ?? [])
            : undefined
        }
        loadingSchools={loadingSchools}
        assignmentVariant={
          allowSchoolOrPlatformAddTab ? "school-or-platform" : "school-only"
        }
        onSubmitPlatform={handleAssignPlatformFromDialog}
        includeIntradarkDevInPlatformPicker={viewerIsIntradarkDev}
      />

      {user && userPlatformRoleKey && (
        <PlatformRoleSwapDialog
          open={isPlatformSwapOpen}
          onOpenChange={setIsPlatformSwapOpen}
          userId={user.id}
          userDisplayName={getDisplayName(user)}
          currentRoleKey={userPlatformRoleKey}
          roles={roles}
          includeIntradarkDevOption={viewerIsIntradarkDev}
          onSuccess={() => onUserUpdate?.()}
        />
      )}

      {/* Toggle Role Confirmation Dialog */}
      <AlertDialog
        open={isToggleRoleDialogOpen && !!roleToToggle}
        onOpenChange={(open) => {
          if (!open && !isTogglingRole) {
            // Only allow closing if not currently toggling
            setIsToggleRoleDialogOpen(false);
            setRoleToToggle(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {roleToToggle?.isAdding ? "Assign Role" : "Remove Role"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {!roleToToggle ? (
                <>Please select a role.</>
              ) : roleToToggle.willRemoveAll ? (
                <>
                  Removing the <strong>{roleToToggle.roleName}</strong> role
                  will remove all roles from {getDisplayName(user)}
                  {roleToToggle.schoolName && (
                    <>
                      {" "}
                      at <strong>{roleToToggle.schoolName}</strong>
                    </>
                  )}
                  . Are you sure?
                </>
              ) : roleToToggle.isAdding ? (
                <>
                  Are you sure you want to assign the role{" "}
                  <strong>{roleToToggle.roleName}</strong> to{" "}
                  {getDisplayName(user)}
                  {roleToToggle.schoolName && (
                    <>
                      {" "}
                      at <strong>{roleToToggle.schoolName}</strong>
                    </>
                  )}
                  ?
                </>
              ) : (
                <>
                  Are you sure you want to remove the role{" "}
                  <strong>{roleToToggle.roleName}</strong> from{" "}
                  {getDisplayName(user)}
                  {roleToToggle.schoolName && (
                    <>
                      {" "}
                      at <strong>{roleToToggle.schoolName}</strong>
                    </>
                  )}
                  ?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsToggleRoleDialogOpen(false);
                setRoleToToggle(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleRole}
              disabled={isTogglingRole}
              className={cn(
                roleToToggle?.isAdding
                  ? "bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90"
                  : "bg-destructive text-secondary hover:bg-destructive/90 focus:ring-destructive",
              )}
            >
              {isTogglingRole ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {roleToToggle?.isAdding ? "Assigning..." : "Removing..."}
                </>
              ) : roleToToggle?.isAdding ? (
                "OK"
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}

export function UserDetailDrawer(props: UserDetailDrawerProps) {
  return <UserDetailDrawerContent {...props} />;
}
