"use client";

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
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs";
import {
  meApi,
  type UserWithRolesAndSchools,
} from "@/entities/me/api/endpoints";
import { rolesApi } from "@/entities/roles/api/endpoints";
import { schoolApi } from "@/entities/school/api/endpoints";
import { usersApi } from "@/entities/users/api/endpoints";
import { useRoles } from "@/entities/users/model/store";
import { useListSchoolsQuery } from "@/entities/school/model/useListSchoolsQuery";
import type { roles } from "@/server/db/schema";
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
  Check,
  School as SchoolIcon,
  ChevronsUpDown,
  X,
  UserPlus,
} from "lucide-react";

// Import extracted components and utilities
import { UserDetailHeader } from "./user-detail-drawer/user-detail-header";
import { UserDetailSidebar } from "./user-detail-drawer/user-detail-sidebar";
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
} from "./user-detail-drawer/utils";
import type {
  UserDetailDrawerProps,
  TabType,
  HistorySubTabType,
} from "./user-detail-drawer/types";

type Role = typeof roles.$inferSelect;

function UserDetailDrawerContent({
  user,
  open,
  onOpenChange,
  onUserUpdate,
}: UserDetailDrawerProps) {
  // Use React Query hooks with Zustand caching for roles and schools
  const { roles, isLoading: loadingRoles } = useRoles();
  const { data: schools = [], isLoading: loadingSchools } = useListSchoolsQuery(
    { limit: 100 }
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
    new Set()
  );
  const [addRoleComboboxOpen, setAddRoleComboboxOpen] = useState(false);
  const [isSavingRoles, setIsSavingRoles] = useState(false);

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

  // Get active tab from query params only - no local state
  const activeTab = (searchParams.get("tab") as TabType) || "details";
  const historySubTab =
    (searchParams.get("historyTab") as HistorySubTabType) || "details";

  // Simple function to update query params - buttons only call this
  // Order: id first, then tab, then other params
  const updateTab = (tab: TabType) => {
    const userId = searchParams.get("id");
    const params = new URLSearchParams();

    // Add id first
    if (userId) {
      params.set("id", userId);
    }

    // Then tab
    params.set("tab", tab);

    // Then historyTab if needed
    if (tab === "history") {
      const currentHistoryTab = searchParams.get("historyTab") || "details";
      params.set("historyTab", currentHistoryTab);
    }

    // Preserve other params (search, role, schoolId, etc.)
    for (const [key, value] of searchParams.entries()) {
      if (key !== "id" && key !== "tab" && key !== "historyTab") {
        params.set(key, value);
      }
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Simple function to update history sub-tab - buttons only call this
  // Order: id first, then tab, then other params
  const updateHistorySubTab = (subTab: "details" | "roles") => {
    const userId = searchParams.get("id");
    const params = new URLSearchParams();

    // Add id first
    if (userId) {
      params.set("id", userId);
    }

    // Then tab
    params.set("tab", "history");

    // Then historyTab
    params.set("historyTab", subTab);

    // Preserve other params (search, role, schoolId, etc.)
    for (const [key, value] of searchParams.entries()) {
      if (key !== "id" && key !== "tab" && key !== "historyTab") {
        params.set(key, value);
      }
    }

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
        (userId) => !updateLogUsers[userId]
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
    PLATFORM_ROLE_KEYS.includes(key)
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
    schoolName?: string
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
    if (!user || !roleToToggle) {
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
          const errorMessage = result.error.message || "Failed to assign role";
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
                sr.roleKey === "SCHOOL_STAFF" && sr.schoolId === role.schoolId
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
              result.error.message || "Failed to remove role";
            setToggleRoleError(errorMessage);
            setIsTogglingRole(false);
            return;
          }
        } else {
          // School roles: handle STAFF removal logic
          // If removing STAFF and user has TEACHER or SCHOOL_ADMIN, remove all roles
          if (role.willRemoveAll && role.schoolId) {
            const rolesToRemove = user.schoolRoles.filter(
              (sr) => sr.schoolId === role.schoolId
            );
            for (const schoolRole of rolesToRemove) {
              const roleToDelete = roles.find(
                (r) => r.key === schoolRole.roleKey
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
                result.error.message || "Failed to remove role";
              setToggleRoleError(errorMessage);
              setIsTogglingRole(false);
              return;
            }

            // If removing TEACHER or SCHOOL_ADMIN, also remove STAFF if no other non-staff roles remain
            if (role.roleKey === "TEACHER" || role.roleKey === "SCHOOL_ADMIN") {
              const remainingRoles = user.schoolRoles.filter(
                (sr) =>
                  sr.schoolId === role.schoolId && sr.roleKey !== role.roleKey
              );
              const hasOtherNonStaffRoles = remainingRoles.some(
                (sr) =>
                  sr.roleKey === "TEACHER" || sr.roleKey === "SCHOOL_ADMIN"
              );
              if (!hasOtherNonStaffRoles) {
                const staffRole = roles.find((r) => r.key === "SCHOOL_STAFF");
                if (staffRole) {
                  const hasStaff = remainingRoles.some(
                    (sr) => sr.roleKey === "SCHOOL_STAFF"
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
      console.error("Failed to toggle role:", err);
      const errorMessage = err.message || "Failed to toggle role";
      setToggleRoleError(errorMessage);
      setIsTogglingRole(false);
      // Keep roleToToggle set on error so user can see which one failed
      // It will be cleared when dialog is closed or user tries again
    }
  };

  const handleRemoveRole = async () => {
    if (!user || !roleToRemove) return;

    try {
      setIsRemovingRole(true);
      const result = await rolesApi.delete.removeRole({
        userId: user.id,
        roleId: roleToRemove.roleId,
        schoolId: roleToRemove.schoolId,
      });

      if (result.error) {
        alert(result.error.message || "Failed to remove role");
        return;
      }

      // Close dialog and reset state
      setIsRemoveRoleDialogOpen(false);
      setRoleToRemove(null);

      // Refresh user data
      onUserUpdate?.();
    } catch (err: any) {
      console.error("Failed to remove role:", err);
      alert(err.message || "Failed to remove role");
    } finally {
      setIsRemovingRole(false);
    }
  };

  const handleSaveRolesFromDialog = async () => {
    if (!user || !addRoleSchoolId || addRoleSelectedRoles.size === 0) {
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
          (sr) => sr.roleKey === role.key && sr.schoolId === addRoleSchoolId
        );

        if (!hasRole) {
          const result = await rolesApi.post.assignRole({
            userId: user.id,
            roleId: roleId,
            schoolId: addRoleSchoolId,
          });

          if (result.error) {
            const errorMessage =
              result.error.message || "Failed to assign role";
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
                sr.roleKey === "SCHOOL_STAFF" && sr.schoolId === addRoleSchoolId
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
      setAddRoleComboboxOpen(false);

      // Refresh user data
      onUserUpdate?.();
    } catch (err: any) {
      console.error("Failed to save roles:", err);
      const errorMessage = err.message || "Failed to save roles";
      setToggleRoleError(errorMessage);
    } finally {
      setIsSavingRoles(false);
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
          <UserDetailSidebar activeTab={activeTab} onTabChange={updateTab} />

          {/* Right Content Area */}
          <main className="flex flex-1 flex-col overflow-hidden min-h-0 pt-2 pr-6 pl-4">
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "details" && (
                <UserDetailsCard user={user} onUserUpdate={onUserUpdate} />
              )}

              {activeTab === "roles" && (
                /* Roles */
                <div className="space-y-4">
                  {/* Warning alerts */}
                  {(userHasPlatformRole ||
                    (userHasSchoolRole && !userHasPlatformRole)) && (
                    <>
                      {userHasPlatformRole && (
                        <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 w-full">
                          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                          <AlertTitle className="text-yellow-800 dark:text-yellow-200">
                            Platform Role Restriction
                          </AlertTitle>
                          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                            This user is a '{platformRoleName}' and can only
                            have one role. They cannot have any other roles.
                          </AlertDescription>
                        </Alert>
                      )}
                      {userHasSchoolRole && !userHasPlatformRole && (
                        <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 w-full">
                          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                          <AlertTitle className="text-yellow-800 dark:text-yellow-200">
                            School Role Restriction
                          </AlertTitle>
                          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                            This user has school roles and cannot have platform
                            roles.
                          </AlertDescription>
                        </Alert>
                      )}
                      <Separator />
                    </>
                  )}

                  {/* Add New Role Button */}
                  {!userHasPlatformRole && (
                    <Button
                      onClick={() => {
                        setIsAddRoleDialogOpen(true);
                        setAddRoleSchoolId("");
                        setAddRoleSelectedRoles(new Set());
                      }}
                      variant="outline"
                      className="w-full md:w-auto"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add New Role
                    </Button>
                  )}

                  {/* Platform Roles */}
                  {/* Only show platform card if user has platform roles AND no school roles */}
                  {userHasPlatformRole &&
                    !userHasSchoolRole &&
                    (() => {
                      const assignedPlatformRoleKeys = new Set(
                        user.platformRoles || []
                      );

                      // Define platform role order
                      const platformRoleOrder = PLATFORM_ROLE_KEYS;

                      return (
                        <div className="space-y-2">
                          <Card className="border">
                            <CardContent className="px-4 py-2 flex items-center justify-between gap-4">
                              {/* Platform Title on Left */}
                              <div className="flex flex-col -space-y-0.5 shrink-0">
                                <h3 className="text-lg font-semibold">
                                  Platform
                                </h3>
                              </div>

                              {/* All Platform Role Badges on Right */}
                              <div className="flex items-center gap-2 flex-wrap justify-end">
                                {platformRoleOrder.map((roleKey) => {
                                  const isAssigned =
                                    assignedPlatformRoleKeys.has(roleKey);
                                  const role = roles.find(
                                    (r) => r.key === roleKey
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
                                    // Assigned role badge
                                    return (
                                      <Badge
                                        key={`${roleKey}-platform-assigned`}
                                        variant="default"
                                        className={cn(
                                          "group flex items-center gap-1 border px-2 py-1 cursor-pointer transition-colors hover:!bg-destructive/10 hover:!text-destructive hover:!border-destructive/30",
                                          getBadgeClasses(roleKey)
                                        )}
                                        onClick={() => {
                                          if (!role) return;
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
                                        <RoleIcon className="h-4 w-4 group-hover:hidden" />
                                        <X className="h-4 w-4 hidden group-hover:block !text-destructive" />
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
                                        className="group flex items-center gap-1 border-dashed border px-2 py-1 cursor-pointer transition-all bg-transparent text-muted-foreground border-muted-foreground hover:animate-pulse"
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.backgroundColor =
                                            "rgba(217, 119, 6, 0.1)";
                                          e.currentTarget.style.color =
                                            roleColor;
                                          e.currentTarget.style.borderColor = `${roleColor}40`;
                                          const icon =
                                            e.currentTarget.querySelector(
                                              "svg"
                                            ) as SVGElement | null;
                                          if (icon) {
                                            icon.style.color = roleColor;
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor =
                                            "transparent";
                                          e.currentTarget.style.color = "";
                                          e.currentTarget.style.borderColor =
                                            "";
                                          const icon =
                                            e.currentTarget.querySelector(
                                              "svg"
                                            ) as SVGElement | null;
                                          if (icon) {
                                            icon.style.color = "";
                                          }
                                        }}
                                        onClick={() => {
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
                        rolesBySchool.entries()
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
                                (s) => s.id === schoolId
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
                                              )
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {/* All Role Checkboxes on Right - Fixed Order: STAFF, SCHOOL_ADMIN, TEACHER */}
                                      <div className="flex items-center gap-2 flex-wrap justify-end">
                                        {(() => {
                                          const assignedRoleKeys = new Set(
                                            schoolRoles.map(
                                              (sr) => sr.roleKey || ""
                                            )
                                          );

                                          // Define role order: STAFF, SCHOOL_ADMIN, TEACHER
                                          const roleOrder = [
                                            "SCHOOL_STAFF",
                                            "SCHOOL_ADMIN",
                                            "TEACHER",
                                          ];

                                          return roleOrder.map((roleKey) => {
                                            const isAssigned =
                                              assignedRoleKeys.has(roleKey);
                                            const schoolRole = schoolRoles.find(
                                              (sr) => sr.roleKey === roleKey
                                            );
                                            const role = roles.find(
                                              (r) => r.key === roleKey
                                            );

                                            if (!role) return null;

                                            const roleName =
                                              schoolRole?.roleName ||
                                              role.name ||
                                              roleKey;

                                            let RoleIcon = UsersIcon;
                                            if (roleKey === "TEACHER") {
                                              RoleIcon = UsersIcon;
                                            } else if (
                                              roleKey === "SCHOOL_ADMIN"
                                            ) {
                                              RoleIcon = ShieldCheck;
                                            }

                                            // Check if removing STAFF will remove all roles
                                            const isStaff =
                                              roleKey === "SCHOOL_STAFF";
                                            const hasTeacherOrAdmin =
                                              schoolRoles.some((sr) => {
                                                const key = sr.roleKey || "";
                                                return (
                                                  key === "TEACHER" ||
                                                  key === "SCHOOL_ADMIN"
                                                );
                                              });
                                            const willRemoveAll =
                                              isStaff && hasTeacherOrAdmin;

                                            // Get role-specific checkbox color classes
                                            const getCheckboxColorClasses = (
                                              roleKey: string
                                            ) => {
                                              if (roleKey === "TEACHER") {
                                                return "data-[state=checked]:border-[var(--role-teacher)] data-[state=checked]:bg-[var(--role-teacher)] data-[state=checked]:text-[var(--role-teacher-text)]";
                                              } else if (
                                                roleKey === "SCHOOL_ADMIN"
                                              ) {
                                                return "data-[state=checked]:border-[var(--role-school-admin)] data-[state=checked]:bg-[var(--role-school-admin)] data-[state=checked]:text-[var(--role-school-admin-text)]";
                                              } else if (
                                                roleKey === "SCHOOL_STAFF"
                                              ) {
                                                return "data-[state=checked]:border-[var(--role-school-staff)] data-[state=checked]:bg-[var(--role-school-staff)] data-[state=checked]:text-[var(--role-school-staff-text)]";
                                              }
                                              return "";
                                            };

                                            // Get role-specific border and background colors for wrapper
                                            const getRoleBorderColor = (
                                              roleKey: string
                                            ) => {
                                              if (roleKey === "TEACHER") {
                                                return "border-[var(--role-teacher)]";
                                              } else if (
                                                roleKey === "SCHOOL_ADMIN"
                                              ) {
                                                return "border-[var(--role-school-admin)]";
                                              } else if (
                                                roleKey === "SCHOOL_STAFF"
                                              ) {
                                                return "border-[var(--role-school-staff)]";
                                              }
                                              return "";
                                            };

                                            const getRoleBgColor = (
                                              roleKey: string
                                            ) => {
                                              if (roleKey === "TEACHER") {
                                                return "bg-[var(--role-teacher)]/5 dark:bg-[var(--role-teacher)]/20";
                                              } else if (
                                                roleKey === "SCHOOL_ADMIN"
                                              ) {
                                                return "bg-[var(--role-school-admin)]/5 dark:bg-[var(--role-school-admin)]/20";
                                              } else if (
                                                roleKey === "SCHOOL_STAFF"
                                              ) {
                                                return "bg-[var(--role-school-staff)]/5 dark:bg-[var(--role-school-staff)]/20";
                                              }
                                              return "";
                                            };

                                            // Check if this role is currently being toggled
                                            const isTogglingThisRole =
                                              isTogglingRole &&
                                              roleToToggle?.roleId ===
                                                role.id &&
                                              roleToToggle?.schoolId ===
                                                schoolId;

                                            return (
                                              <div
                                                key={`${roleKey}-${schoolId}`}
                                                className={cn(
                                                  "flex items-center gap-2 rounded-md border px-2 py-1 transition-colors",
                                                  isAssigned
                                                    ? `${getRoleBorderColor(roleKey)} ${getRoleBgColor(roleKey)}`
                                                    : "border-dashed border-muted-foreground"
                                                )}
                                              >
                                                <Checkbox
                                                  id={`school-role-${schoolId}-${roleKey}`}
                                                  checked={isAssigned}
                                                  disabled={
                                                    userHasPlatformRole ||
                                                    isTogglingThisRole
                                                  }
                                                  onCheckedChange={(
                                                    checked
                                                  ) => {
                                                    if (!role) return;
                                                    setRoleToToggle({
                                                      roleId: role.id,
                                                      roleKey,
                                                      roleName,
                                                      schoolId: schoolId,
                                                      schoolName: schoolName,
                                                      isAdding: !!checked,
                                                      willRemoveAll:
                                                        !checked &&
                                                        willRemoveAll,
                                                    });
                                                    setIsToggleRoleDialogOpen(
                                                      true
                                                    );
                                                  }}
                                                  className={cn(
                                                    "rounded",
                                                    getCheckboxColorClasses(
                                                      roleKey
                                                    )
                                                  )}
                                                />
                                                <Label
                                                  htmlFor={`school-role-${schoolId}-${roleKey}`}
                                                  className="flex items-center gap-1.5 cursor-pointer"
                                                >
                                                  {isTogglingThisRole ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                  ) : (
                                                    <RoleIcon
                                                      className={cn(
                                                        "h-3 w-3",
                                                        !isAssigned &&
                                                          "text-muted-foreground"
                                                      )}
                                                    />
                                                  )}
                                                  <span
                                                    className={cn(
                                                      "text-xs font-medium",
                                                      !isAssigned &&
                                                        "text-muted-foreground"
                                                    )}
                                                  >
                                                    {roleName}
                                                  </span>
                                                </Label>
                                              </div>
                                            );
                                          });
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
                <UserPositionsTab user={user} schools={schools} />
              )}

              {activeTab === "classes" && (
                <UserClassesTab user={user} schools={schools} />
              )}

              {activeTab === "history" && (
                <UserHistoryTab
                  user={user}
                  historySubTab={historySubTab}
                  onHistorySubTabChange={updateHistorySubTab}
                  updateLogUsers={updateLogUsers}
                />
              )}

              {activeTab === "features" && <UserFeaturesTab user={user} />}
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

      {/* Add Role Dialog */}
      <Dialog open={isAddRoleDialogOpen} onOpenChange={setIsAddRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Role</DialogTitle>
            <DialogDescription>
              Select a school and assign roles to {getDisplayName(user)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* School Selection */}
            <div className="space-y-2">
              <Label htmlFor="add-role-school-select">School *</Label>
              <Popover
                open={addRoleComboboxOpen}
                onOpenChange={setAddRoleComboboxOpen}
                modal
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={addRoleComboboxOpen}
                    className="w-full justify-between"
                    disabled={loadingSchools}
                  >
                    {addRoleSchoolId
                      ? schools.find((school) => school.id === addRoleSchoolId)
                          ?.name
                      : "Select a school..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Search school..." />
                    <CommandList>
                      <CommandEmpty>No school found.</CommandEmpty>
                      <CommandGroup>
                        {schools
                          .filter((school) => {
                            // Filter out schools that already have roles assigned
                            const hasRolesAtSchool = user.schoolRoles.some(
                              (sr) => sr.schoolId === school.id
                            );
                            return !hasRolesAtSchool;
                          })
                          .map((school) => {
                            const { stateText, sectorText, levelsText } =
                              extractSchoolMetadata(school);
                            const parts = [
                              stateText,
                              sectorText,
                              levelsText,
                            ].filter(Boolean);
                            return (
                              <CommandItem
                                key={school.id}
                                value={`${school.id} ${school.name}`}
                                onSelect={() => {
                                  setAddRoleSchoolId(
                                    school.id === addRoleSchoolId
                                      ? ""
                                      : school.id
                                  );
                                  setAddRoleComboboxOpen(false);
                                  // Reset selected roles when school changes
                                  setAddRoleSelectedRoles(new Set());
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    addRoleSchoolId === school.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col -space-y-0.5">
                                  <span>{school.name}</span>
                                  {parts.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      {parts.join(" • ")}
                                    </span>
                                  )}
                                </div>
                              </CommandItem>
                            );
                          })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Role Selection with Checkboxes */}
            {addRoleSchoolId && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground ml-2">
                  Roles
                </Label>
                {(() => {
                  // Only show STAFF, TEACHER, and SCHOOL_ADMIN
                  const schoolRoles = roles.filter((role) => {
                    const roleKey = role.key || "";
                    return (
                      roleKey === "TEACHER" ||
                      roleKey === "SCHOOL_ADMIN" ||
                      roleKey === "SCHOOL_STAFF"
                    );
                  });

                  // Sort: STAFF first, then TEACHER, then SCHOOL_ADMIN
                  const sortedRoles = [...schoolRoles].sort((a, b) => {
                    const order: Record<string, number> = {
                      SCHOOL_STAFF: 1,
                      TEACHER: 2,
                      SCHOOL_ADMIN: 3,
                    };
                    return (
                      (order[a.key || ""] || 999) - (order[b.key || ""] || 999)
                    );
                  });

                  return sortedRoles.map((role) => {
                    const roleKey = role.key || "";
                    const isStaff = roleKey === "SCHOOL_STAFF";
                    const isSelected = addRoleSelectedRoles.has(role.id);

                    let RoleIcon = UsersIcon;
                    if (roleKey === "TEACHER") {
                      RoleIcon = UsersIcon;
                    } else if (roleKey === "SCHOOL_ADMIN") {
                      RoleIcon = ShieldCheck;
                    }

                    // Get role-specific color classes
                    const getRoleBorderColor = (roleKey: string) => {
                      if (roleKey === "TEACHER") {
                        return "border-[var(--role-teacher)]";
                      } else if (roleKey === "SCHOOL_ADMIN") {
                        return "border-[var(--role-school-admin)]";
                      } else if (roleKey === "SCHOOL_STAFF") {
                        return "border-[var(--role-school-staff)]";
                      }
                      return "border-muted";
                    };

                    const getRoleBgColor = (roleKey: string) => {
                      if (roleKey === "TEACHER") {
                        return "bg-[var(--role-teacher)]/10 dark:bg-[var(--role-teacher)]/20";
                      } else if (roleKey === "SCHOOL_ADMIN") {
                        return "bg-[var(--role-school-admin)]/10 dark:bg-[var(--role-school-admin)]/20";
                      } else if (roleKey === "SCHOOL_STAFF") {
                        return "bg-[var(--role-school-staff)]/10 dark:bg-[var(--role-school-staff)]/20";
                      }
                      return "";
                    };

                    const getCheckboxColorClasses = (roleKey: string) => {
                      if (roleKey === "TEACHER") {
                        return "data-[state=checked]:border-[var(--role-teacher)] data-[state=checked]:bg-[var(--role-teacher)] data-[state=checked]:text-[var(--role-teacher-text)]";
                      } else if (roleKey === "SCHOOL_ADMIN") {
                        return "data-[state=checked]:border-[var(--role-school-admin)] data-[state=checked]:bg-[var(--role-school-admin)] data-[state=checked]:text-[var(--role-school-admin-text)]";
                      } else if (roleKey === "SCHOOL_STAFF") {
                        return "data-[state=checked]:border-[var(--role-school-staff)] data-[state=checked]:bg-[var(--role-school-staff)] data-[state=checked]:text-[var(--role-school-staff-text)]";
                      }
                      return "";
                    };

                    // Staff role is always checked and disabled
                    if (isStaff) {
                      return (
                        <div
                          key={role.id}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border bg-white dark:bg-background p-3 cursor-not-allowed opacity-60 shadow-sm",
                            `${getRoleBorderColor(roleKey)}/50 ${getRoleBgColor(roleKey)}`
                          )}
                        >
                          <Checkbox
                            id={`role-${role.id}`}
                            checked={true}
                            disabled={true}
                            className={cn(
                              "rounded",
                              getCheckboxColorClasses(roleKey)
                            )}
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <RoleIcon className="h-4 w-4" />
                            <span className="text-sm font-medium text-primary">
                              {role.name} (assigned by default)
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <Label
                        key={role.id}
                        htmlFor={`role-${role.id}`}
                        className={cn(
                          "hover:bg-accent/50 flex items-center gap-3 rounded-lg border bg-white dark:bg-background p-3 cursor-pointer shadow-sm transition-colors",
                          isSelected
                            ? `${getRoleBorderColor(roleKey)} ${getRoleBgColor(roleKey)}`
                            : "border-muted"
                        )}
                      >
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(addRoleSelectedRoles);
                            if (checked) {
                              newSelected.add(role.id);
                            } else {
                              newSelected.delete(role.id);
                            }
                            setAddRoleSelectedRoles(newSelected);
                          }}
                          className={cn(
                            "rounded",
                            getCheckboxColorClasses(roleKey)
                          )}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <RoleIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {role.name}
                          </span>
                        </div>
                      </Label>
                    );
                  });
                })()}
              </div>
            )}

            {toggleRoleError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{toggleRoleError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddRoleDialogOpen(false);
                setAddRoleSchoolId("");
                setAddRoleSelectedRoles(new Set());
                setAddRoleComboboxOpen(false);
                setToggleRoleError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveRolesFromDialog}
              disabled={
                !addRoleSchoolId ||
                addRoleSelectedRoles.size === 0 ||
                isSavingRoles
              }
            >
              {isSavingRoles ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Roles"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  : "bg-destructive text-secondary hover:bg-destructive/90 focus:ring-destructive"
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
