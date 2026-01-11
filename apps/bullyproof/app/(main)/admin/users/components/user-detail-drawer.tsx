"use client";

import { useState, useEffect } from "react";
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
  Plus,
  AlertCircle,
  Pencil,
  Save,
  History,
  Check,
  School as SchoolIcon,
  ChevronsUpDown,
} from "lucide-react";

// Import extracted components and utilities
import { UserDetailHeader } from "./user-detail-drawer/user-detail-header";
import { UserDetailSidebar } from "./user-detail-drawer/user-detail-sidebar";
import { UserDetailsCard } from "./user-detail-drawer/user-details-card";
import { UserHistoryTab } from "./user-detail-drawer/user-history-tab";
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
  AddRoleStep,
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Add role dialog state - derived from query params
  const addRoleFromUrl = searchParams.get("addRole") === "true";
  const schoolIdFromUrl = searchParams.get("schoolId") || "";
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [isAssigningRole, setIsAssigningRole] = useState(false);
  const [assignRoleSuccess, setAssignRoleSuccess] = useState(false);
  const [assignRoleError, setAssignRoleError] = useState<string | null>(null);
  const [addRoleStep, setAddRoleStep] = useState<AddRoleStep>("school");
  const [schoolComboboxOpen, setSchoolComboboxOpen] = useState(false);
  const [isUnavailableRoleDialogOpen, setIsUnavailableRoleDialogOpen] =
    useState(false);
  const [unavailableRoleToAssign, setUnavailableRoleToAssign] = useState<{
    roleId: string;
    roleName: string;
  } | null>(null);

  // Inline add role state
  const [inlineAddRoleSchoolId, setInlineAddRoleSchoolId] =
    useState<string>("");
  const [inlineAddRoleSelectedRoles, setInlineAddRoleSelectedRoles] = useState<
    Set<string>
  >(new Set());
  const [inlineAddRoleComboboxOpen, setInlineAddRoleComboboxOpen] =
    useState(false);
  const [isSavingInlineRoles, setIsSavingInlineRoles] = useState(false);

  // Toggle role confirmation dialog
  const [isToggleRoleDialogOpen, setIsToggleRoleDialogOpen] = useState(false);
  const [roleToToggle, setRoleToToggle] = useState<{
    roleId: string;
    roleKey: string;
    roleName: string;
    schoolId: string;
    schoolName?: string;
    isAdding: boolean;
    willRemoveAll?: boolean;
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

  // Determine initial step based on user's existing roles
  useEffect(() => {
    if (addRoleFromUrl) {
      // If schoolId is provided in URL (clicked from school card), skip school selection
      if (schoolIdFromUrl) {
        setSelectedSchoolId(schoolIdFromUrl);
        setAddRoleStep("role"); // Go straight to role selection
      } else if (userHasSchoolRole && !userHasPlatformRole) {
        // If user has school roles but no schoolId in URL, start with school selection
        setAddRoleStep("school");
      } else {
        // Otherwise start with role selection
        setAddRoleStep("role");
      }
    } else {
      // Reset when dialog closes
      setAddRoleStep(
        userHasSchoolRole && !userHasPlatformRole ? "school" : "role"
      );
      setSelectedRoleId("");
      setSelectedSchoolId("");
    }
  }, [addRoleFromUrl, schoolIdFromUrl, userHasSchoolRole, userHasPlatformRole]);

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

  // Get all roles with availability status
  const getAllRolesWithStatus = () => {
    if (!user) return [];

    // Platform roles the user already has
    const userPlatformRoleKeys = new Set(user.platformRoles || []);

    // School roles the user already has at the selected school (if school is selected)
    const userSchoolRoleKeysAtSelectedSchool = selectedSchoolId
      ? new Set(
          (user.schoolRoles || [])
            .filter((sr) => sr.schoolId === selectedSchoolId)
            .map((sr) => sr.roleKey || "")
            .filter(Boolean)
        )
      : new Set<string>();

    // Check if role is a platform role
    const isPlatformRole = (roleKey: string) =>
      PLATFORM_ROLE_KEYS.includes(roleKey);

    // Check if role is a school role
    const isSchoolRole = (roleKey: string) =>
      roleKey.includes("SCHOOL") || roleKey.includes("TEACHER");

    return roles.map((role) => {
      const roleKey = role.key || "";
      const isAssigningPlatformRole = isPlatformRole(roleKey);
      const isAssigningSchoolRole = isSchoolRole(roleKey);

      let isAvailable = true;
      let reason = "";

      // If user has platform role, they can only have that one role
      if (userHasPlatformRole) {
        // Only allow the platform role they already have
        isAvailable = userPlatformRoleKeys.has(roleKey);
        if (!isAvailable) {
          reason = "User already has a platform role";
        }
      } else {
        // If user has school roles, they cannot have platform roles
        if (userHasSchoolRole && isAssigningPlatformRole) {
          isAvailable = false;
          reason = "User has school roles";
        }

        // If assigning platform role and user has any roles, prevent it
        if (
          isAssigningPlatformRole &&
          (userHasPlatformRole || userHasSchoolRole)
        ) {
          isAvailable = false;
          reason = "User already has roles";
        }

        // For platform roles, filter out if user already has it
        if (isAssigningPlatformRole && userPlatformRoleKeys.has(roleKey)) {
          isAvailable = false;
          reason = "User already has this role";
        }

        // For school roles, check SCHOOL_LICENCE exclusivity
        if (isAssigningSchoolRole) {
          const isSchoolLicenceRole = roleKey === "SCHOOL_LICENCE";

          // If user has SCHOOL_LICENCE, they cannot have other school roles
          if (userHasSchoolLicence && !isSchoolLicenceRole) {
            isAvailable = false;
            reason = "User has SCHOOL_LICENCE";
          }

          // If user has other school roles, they cannot have SCHOOL_LICENCE
          if (userHasNonLicenceSchoolRole && isSchoolLicenceRole) {
            isAvailable = false;
            reason = "User has other school roles";
          }

          // If a school is selected, filter out roles the user already has at that school
          if (
            selectedSchoolId &&
            userSchoolRoleKeysAtSelectedSchool.has(roleKey)
          ) {
            isAvailable = false;
            reason = "User already has this role at this school";
          }
        }
      }

      return {
        role,
        isAvailable,
        reason,
      };
    });
  };

  // Get available roles that the user doesn't already have (for filtering)
  const getAvailableRoles = () => {
    return getAllRolesWithStatus()
      .filter((item) => item.isAvailable)
      .map((item) => item.role);
  };

  const handleAddRole = async () => {
    if (!user || !selectedRoleId) return;

    const selectedRole = roles.find((r) => r.id === selectedRoleId);
    if (!selectedRole) return;

    // Clear previous errors
    setAssignRoleError(null);

    // Determine if this is a platform or school role
    const roleKey = selectedRole.key || "";
    const isAssigningPlatformRole = PLATFORM_ROLE_KEYS.includes(roleKey);
    const isAssigningSchoolRole =
      roleKey.includes("SCHOOL") || roleKey.includes("TEACHER");

    // For school roles, we need schoolId
    if (isAssigningSchoolRole && !selectedSchoolId) {
      setAssignRoleError("Please select a school for school roles");
      return;
    }

    // Validate platform role constraints
    if (isAssigningPlatformRole) {
      // Platform roles must have NULL school_id
      if (selectedSchoolId) {
        setAssignRoleError("Platform roles must have school_id set to NULL");
        return;
      }
      // Platform roles are exclusive - user can only have one role total
      if (userHasPlatformRole || userHasSchoolRole) {
        setAssignRoleError(
          "Users with platform roles can only have one role. Please remove all other roles first."
        );
        return;
      }
    }

    // Validate school role constraints
    if (isAssigningSchoolRole) {
      // School roles must have a school_id
      if (!selectedSchoolId) {
        setAssignRoleError("School roles must have a school_id");
        return;
      }
      // Users with platform roles cannot have school roles
      if (userHasPlatformRole) {
        setAssignRoleError(
          "Users with platform roles cannot have school roles. Please remove platform roles first."
        );
        return;
      }

      // Check SCHOOL_LICENCE exclusivity
      const isAssigningSchoolLicence = roleKey === "SCHOOL_LICENCE";

      // If assigning SCHOOL_LICENCE, user cannot have other school roles
      if (isAssigningSchoolLicence && userHasNonLicenceSchoolRole) {
        setAssignRoleError(
          "Users with school roles cannot have SCHOOL_LICENCE. Please remove all other school roles first."
        );
        return;
      }

      // If assigning non-SCHOOL_LICENCE school role, user cannot have SCHOOL_LICENCE
      if (!isAssigningSchoolLicence && userHasSchoolLicence) {
        setAssignRoleError(
          "Users with SCHOOL_LICENCE cannot have other school roles. Please remove SCHOOL_LICENCE first."
        );
        return;
      }
    }

    // If user has platform role, prevent assigning school roles
    if (userHasPlatformRole && isAssigningSchoolRole) {
      setAssignRoleError(
        "Users with platform roles cannot have school roles. Please remove platform roles first."
      );
      return;
    }

    // If user has school roles, prevent assigning platform roles
    if (userHasSchoolRole && isAssigningPlatformRole) {
      setAssignRoleError(
        "Users with school roles cannot have platform roles. Please remove school roles first."
      );
      return;
    }

    try {
      setIsAssigningRole(true);
      setAssignRoleError(null);
      const result = await rolesApi.post.assignRole({
        userId: user.id,
        roleId: selectedRoleId,
        schoolId: selectedSchoolId || undefined,
      });

      if (result.error) {
        const errorMessage = result.error.message || "Failed to assign role";
        setAssignRoleError(errorMessage);
        setIsAssigningRole(false);
        return;
      }

      // Show success state
      setAssignRoleSuccess(true);
      setIsAssigningRole(false);

      // Wait 1 second, then close dialog and refresh
      setTimeout(() => {
        // Reset form and close dialog
        setSelectedRoleId("");
        setSelectedSchoolId("");
        setAssignRoleError(null);
        setAssignRoleSuccess(false);
        setAddRoleStep(
          userHasSchoolRole && !userHasPlatformRole ? "school" : "role"
        );

        // Clear query params
        const params = new URLSearchParams();
        const userId = searchParams.get("id");
        if (userId) params.set("id", userId);
        const currentTab = searchParams.get("tab") || "details";
        params.set("tab", currentTab);
        const historyTab = searchParams.get("historyTab");
        if (historyTab) params.set("historyTab", historyTab);
        // Preserve other params
        for (const [key, value] of searchParams.entries()) {
          if (
            key !== "id" &&
            key !== "tab" &&
            key !== "historyTab" &&
            key !== "addRole" &&
            key !== "schoolId"
          ) {
            params.set(key, value);
          }
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });

        // Refresh user data
        onUserUpdate?.();
      }, 1000);
    } catch (err: any) {
      console.error("Failed to assign role:", err);
      const errorMessage = err.message || "Failed to assign role";
      setAssignRoleError(errorMessage);
      setIsAssigningRole(false);
    }
  };

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

  const handleAssignUnavailableRole = async () => {
    if (!user || !unavailableRoleToAssign || !selectedSchoolId) return;

    try {
      setIsAssigningRole(true);
      setAssignRoleError(null);
      const result = await rolesApi.post.assignRole({
        userId: user.id,
        roleId: unavailableRoleToAssign.roleId,
        schoolId: selectedSchoolId,
      });

      if (result.error) {
        const errorMessage = result.error.message || "Failed to assign role";
        setAssignRoleError(errorMessage);
        setIsAssigningRole(false);
        setIsUnavailableRoleDialogOpen(false);
        return;
      }

      // Close dialog and refresh
      setIsUnavailableRoleDialogOpen(false);
      setUnavailableRoleToAssign(null);
      setIsAssigningRole(false);

      // Refresh user data
      onUserUpdate?.();
    } catch (err: any) {
      console.error("Failed to assign role:", err);
      const errorMessage = err.message || "Failed to assign role";
      setAssignRoleError(errorMessage);
      setIsAssigningRole(false);
      setIsUnavailableRoleDialogOpen(false);
    }
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
      setAssignRoleError(null);

      if (role.isAdding) {
        // Assign role
        const result = await rolesApi.post.assignRole({
          userId: user.id,
          roleId: roleToToggle.roleId,
          schoolId: roleToToggle.schoolId,
        });

        if (result.error) {
          const errorMessage = result.error.message || "Failed to assign role";
          setAssignRoleError(errorMessage);
          setIsTogglingRole(false);
          return;
        }

        // Auto-add STAFF if assigning TEACHER or SCHOOL_ADMIN
        if (role.roleKey === "TEACHER" || role.roleKey === "SCHOOL_ADMIN") {
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
          setAssignRoleError("Role not found");
          setIsTogglingRole(false);
          return;
        }

        // If removing STAFF and user has TEACHER or SCHOOL_ADMIN, remove all roles
        if (role.willRemoveAll) {
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
            setAssignRoleError(errorMessage);
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
              (sr) => sr.roleKey === "TEACHER" || sr.roleKey === "SCHOOL_ADMIN"
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

      // Close dialog and refresh
      setIsToggleRoleDialogOpen(false);
      const toggledRole = role;
      setRoleToToggle(null);
      setIsTogglingRole(false);

      // If this was from the inline form, reset the form
      if (toggledRole && inlineAddRoleSchoolId === toggledRole.schoolId) {
        setInlineAddRoleSchoolId("");
        setInlineAddRoleSelectedRoles(new Set());
      }

      // Refresh user data
      onUserUpdate?.();
    } catch (err: any) {
      console.error("Failed to toggle role:", err);
      const errorMessage = err.message || "Failed to toggle role";
      setAssignRoleError(errorMessage);
      setIsTogglingRole(false);
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

  // Get the selected role
  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  // Determine if role requires a school based on role key
  const roleRequiresSchool = selectedRole
    ? selectedRole.key === "TEACHER" ||
      selectedRole.key === "SCHOOL_ADMIN" ||
      selectedRole.key === "SCHOOL_STAFF" ||
      selectedRole.key === "SCHOOL_LICENCE"
    : false;

  // Get platform vs school roles for display
  const platformRoles = getAvailableRoles().filter((role) => {
    const roleKey = role.key || "";
    // Use the same logic as backend - check against platform role keys
    return PLATFORM_ROLE_KEYS.includes(roleKey);
  });

  const schoolRoles = getAvailableRoles().filter((role) => {
    const roleKey = role.key || "";
    // School roles are TEACHER, SCHOOL_ADMIN, SCHOOL_STAFF, SCHOOL_LICENCE
    return (
      roleKey === "TEACHER" ||
      roleKey === "SCHOOL_ADMIN" ||
      roleKey === "SCHOOL_STAFF" ||
      roleKey === "SCHOOL_LICENCE"
    );
  });

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

                  {/* Add New Role Inline Form */}
                  {!userHasPlatformRole && (
                    <Card className="border">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                          {/* Left: School Selection */}
                          <div className="flex-1 space-y-2">
                            <Label htmlFor="inline-school-select">
                              School *
                            </Label>
                            <Popover
                              open={inlineAddRoleComboboxOpen}
                              onOpenChange={setInlineAddRoleComboboxOpen}
                              modal
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={inlineAddRoleComboboxOpen}
                                  className="w-full justify-between"
                                  disabled={loadingSchools}
                                >
                                  {inlineAddRoleSchoolId
                                    ? schools.find(
                                        (school) =>
                                          school.id === inlineAddRoleSchoolId
                                      )?.name
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
                                    <CommandEmpty>
                                      No school found.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {schools.map((school) => {
                                        const {
                                          stateText,
                                          sectorText,
                                          levelsText,
                                        } = extractSchoolMetadata(school);
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
                                              setInlineAddRoleSchoolId(
                                                school.id ===
                                                  inlineAddRoleSchoolId
                                                  ? ""
                                                  : school.id
                                              );
                                              setInlineAddRoleComboboxOpen(
                                                false
                                              );
                                              // Reset selected roles when school changes
                                              setInlineAddRoleSelectedRoles(
                                                new Set()
                                              );
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                inlineAddRoleSchoolId ===
                                                  school.id
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

                          {/* Right: Role Selection */}
                          <div className="flex-1 space-y-2">
                            <Label>Roles</Label>
                            <div className="flex flex-wrap gap-2">
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

                                const staffRole = schoolRoles.find(
                                  (r) => r.key === "SCHOOL_STAFF"
                                );
                                const staffRoleId = staffRole?.id || "";

                                return schoolRoles.map((role) => {
                                  const roleKey = role.key || "";
                                  const isSelected =
                                    inlineAddRoleSelectedRoles.has(role.id);
                                  const isStaff = roleKey === "SCHOOL_STAFF";

                                  // Get badge styling for selected state
                                  const getBadgeClasses = (roleKey: string) => {
                                    if (roleKey === "TEACHER") {
                                      return "bg-[var(--role-teacher)] text-[var(--role-teacher-text)] border-[var(--role-teacher)]/50";
                                    } else if (roleKey === "SCHOOL_ADMIN") {
                                      return "bg-[var(--role-school-admin)] text-[var(--role-school-admin-text)] border-[var(--role-school-admin)]/50";
                                    } else if (roleKey === "SCHOOL_STAFF") {
                                      return "bg-[var(--role-school-staff)] text-[var(--role-school-staff-text)] border-[var(--role-school-staff)]/50";
                                    }
                                    return "";
                                  };

                                  // Get role color for unselected state
                                  const getRoleColor = (roleKey: string) => {
                                    if (roleKey === "TEACHER") {
                                      return "var(--role-teacher)";
                                    } else if (roleKey === "SCHOOL_ADMIN") {
                                      return "var(--role-school-admin)";
                                    } else if (roleKey === "SCHOOL_STAFF") {
                                      return "var(--role-school-staff)";
                                    }
                                    return "var(--foreground)";
                                  };

                                  const roleColor = getRoleColor(roleKey);

                                  let RoleIcon = UsersIcon;
                                  if (roleKey === "TEACHER") {
                                    RoleIcon = UsersIcon;
                                  } else if (roleKey === "SCHOOL_ADMIN") {
                                    RoleIcon = ShieldCheck;
                                  }

                                  return (
                                    <Badge
                                      key={role.id}
                                      variant={
                                        isSelected ? "default" : "outline"
                                      }
                                      className={cn(
                                        "flex items-center gap-1 border px-2 py-1 cursor-pointer transition-all",
                                        isSelected
                                          ? getBadgeClasses(roleKey)
                                          : "bg-transparent hover:animate-pulse"
                                      )}
                                      style={
                                        !isSelected
                                          ? {
                                              borderColor: `${roleColor}40`,
                                              color: roleColor,
                                            }
                                          : undefined
                                      }
                                      onClick={() => {
                                        if (!inlineAddRoleSchoolId) return;

                                        // Show confirmation dialog
                                        const school = schools.find(
                                          (s) => s.id === inlineAddRoleSchoolId
                                        );
                                        setRoleToToggle({
                                          roleId: role.id,
                                          roleKey,
                                          roleName: role.name,
                                          schoolId: inlineAddRoleSchoolId,
                                          schoolName: school?.name,
                                          isAdding: !isSelected,
                                        });
                                        setIsToggleRoleDialogOpen(true);
                                      }}
                                    >
                                      <RoleIcon
                                        className="h-3 w-3"
                                        style={
                                          !isSelected
                                            ? { color: roleColor }
                                            : undefined
                                        }
                                      />
                                      {role.name}
                                    </Badge>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        </div>

                        {assignRoleError && (
                          <Alert variant="destructive" className="mt-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>
                              {assignRoleError}
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Platform Roles */}
                  {user.platformRoles.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Platform</h3>
                      <div className="space-y-2">
                        {user.platformRoles.map((roleKey, idx) => {
                          const role = roles.find((r) => r.key === roleKey);
                          const roleName = role?.name || roleKey;
                          const isAdmin =
                            roleKey.includes("ADMIN") ||
                            roleKey.includes("admin");

                          const getBadgeClasses = (roleKey: string) => {
                            if (roleKey === "PLATFORM_ADMIN") {
                              return "bg-[var(--role-platform-admin)] text-[var(--role-platform-admin-text)] border-[var(--role-platform-admin)]/50";
                            }
                            return "";
                          };

                          return (
                            <Card key={idx} className="w-full border">
                              <CardContent className="px-4 py-2 flex items-center justify-between group p-0">
                                <Badge
                                  variant="default"
                                  className={cn(
                                    "flex items-center gap-1 border px-2 py-1",
                                    getBadgeClasses(roleKey)
                                  )}
                                >
                                  {isAdmin ? (
                                    <ShieldCheck className="h-4 w-4" />
                                  ) : (
                                    <UsersIcon className="h-4 w-4" />
                                  )}
                                  {roleName}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-destructive/50 transition-colors"
                                  onClick={() =>
                                    handleRemoveRoleClick(
                                      roleKey,
                                      roleName,
                                      true
                                    )
                                  }
                                >
                                  <Trash2 className="h-4 w-4 text-destructive group-hover:animate-[shake_0.5s_ease-in-out_2_forwards]" />
                                </Button>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

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

                      const schoolEntries = Array.from(rolesBySchool.entries());

                      return (
                        <div className="space-y-8">
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
                                <Card className="border">
                                  <CardContent className="px-4 py-1 flex items-center gap-2">
                                    <div className="flex flex-col -space-y-0.5 shrink-0">
                                      <h3 className="text-lg font-semibold">
                                        {schoolName}
                                      </h3>
                                      {metadataParts.length > 0 && (
                                        <div className="flex items-center gap-1 text-muted-foreground text-[0.65rem]">
                                          {metadataParts.map((part, index) => (
                                            <div
                                              key={index}
                                              className="flex items-center gap-1"
                                            >
                                              <div className="truncate capitalize">
                                                {part}
                                              </div>
                                              {index <
                                                metadataParts.length - 1 && (
                                                <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
                                      {/* Add New Role Badge for this school */}
                                      {!userHasPlatformRole && (
                                        <Badge
                                          variant="outline"
                                          className="border-dashed cursor-pointer hover:bg-muted transition-colors flex items-center gap-1 px-2 py-1"
                                          onClick={() => {
                                            const params =
                                              new URLSearchParams();
                                            const userId =
                                              searchParams.get("id");
                                            if (userId)
                                              params.set("id", userId);
                                            const currentTab =
                                              searchParams.get("tab") ||
                                              "details";
                                            params.set("tab", currentTab);
                                            params.set("addRole", "true");
                                            params.set("schoolId", schoolId);
                                            router.replace(
                                              `${pathname}?${params.toString()}`,
                                              { scroll: false }
                                            );
                                            // Skip school selection step since school is already selected
                                            setSelectedSchoolId(schoolId);
                                            setAddRoleStep("role");
                                          }}
                                        >
                                          <Plus className="h-3 w-3" />
                                          Add new role
                                        </Badge>
                                      )}

                                      {/* Role Badges - Only show STAFF, TEACHER, SCHOOL_ADMIN */}
                                      {schoolRoles
                                        .filter((sr) => {
                                          const roleKey = sr.roleKey || "";
                                          return (
                                            roleKey === "TEACHER" ||
                                            roleKey === "SCHOOL_ADMIN" ||
                                            roleKey === "SCHOOL_STAFF"
                                          );
                                        })
                                        .map((schoolRole, idx) => {
                                          const roleName =
                                            schoolRole.roleName ||
                                            schoolRole.roleKey ||
                                            "Unknown";
                                          const roleKey =
                                            schoolRole.roleKey || "";
                                          const role = roles.find(
                                            (r) => r.key === roleKey
                                          );

                                          const getBadgeClasses = (
                                            roleKey: string
                                          ) => {
                                            if (roleKey === "TEACHER") {
                                              return "bg-[var(--role-teacher)] text-[var(--role-teacher-text)] border-[var(--role-teacher)]/50";
                                            } else if (
                                              roleKey === "SCHOOL_ADMIN"
                                            ) {
                                              return "bg-[var(--role-school-admin)] text-[var(--role-school-admin-text)] border-[var(--role-school-admin)]/50";
                                            } else if (
                                              roleKey === "SCHOOL_STAFF"
                                            ) {
                                              return "bg-[var(--role-school-staff)] text-[var(--role-school-staff-text)] border-[var(--role-school-staff)]/50";
                                            }
                                            return "";
                                          };

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

                                          let RoleIcon = UsersIcon;
                                          if (roleKey === "TEACHER") {
                                            RoleIcon = UsersIcon;
                                          } else if (
                                            roleKey === "SCHOOL_ADMIN"
                                          ) {
                                            RoleIcon = ShieldCheck;
                                          }

                                          return (
                                            <Badge
                                              key={idx}
                                              variant="default"
                                              className={cn(
                                                "flex items-center gap-1 border px-2 py-1 cursor-pointer transition-colors",
                                                getBadgeClasses(roleKey)
                                              )}
                                              onClick={() => {
                                                if (!role) return;
                                                setRoleToToggle({
                                                  roleId: role.id,
                                                  roleKey,
                                                  roleName,
                                                  schoolId:
                                                    schoolRole.schoolId || "",
                                                  schoolName:
                                                    schoolRole.schoolName ||
                                                    undefined,
                                                  isAdding: false,
                                                  willRemoveAll,
                                                });
                                                setIsToggleRoleDialogOpen(true);
                                              }}
                                            >
                                              <RoleIcon className="h-4 w-4" />
                                              {roleName}
                                            </Badge>
                                          );
                                        })}

                                      {/* Show available roles for this school that aren't assigned yet */}
                                      {!userHasPlatformRole &&
                                        (() => {
                                          const assignedRoleKeys = new Set(
                                            schoolRoles.map(
                                              (sr) => sr.roleKey || ""
                                            )
                                          );
                                          const availableRoles = roles.filter(
                                            (role) => {
                                              const roleKey = role.key || "";
                                              return (
                                                (roleKey === "TEACHER" ||
                                                  roleKey === "SCHOOL_ADMIN" ||
                                                  roleKey === "SCHOOL_STAFF") &&
                                                !assignedRoleKeys.has(roleKey)
                                              );
                                            }
                                          );

                                          return availableRoles.map((role) => {
                                            const roleKey = role.key || "";

                                            // Get role color for text and border
                                            const getRoleColor = (
                                              roleKey: string
                                            ) => {
                                              if (roleKey === "TEACHER") {
                                                return "var(--role-teacher)";
                                              } else if (
                                                roleKey === "SCHOOL_ADMIN"
                                              ) {
                                                return "var(--role-school-admin)";
                                              } else if (
                                                roleKey === "SCHOOL_STAFF"
                                              ) {
                                                return "var(--role-school-staff)";
                                              }
                                              return "var(--foreground)";
                                            };

                                            const roleColor =
                                              getRoleColor(roleKey);

                                            let RoleIcon = UsersIcon;
                                            if (roleKey === "TEACHER") {
                                              RoleIcon = UsersIcon;
                                            } else if (
                                              roleKey === "SCHOOL_ADMIN"
                                            ) {
                                              RoleIcon = ShieldCheck;
                                            }

                                            return (
                                              <Badge
                                                key={role.id}
                                                variant="outline"
                                                className="flex items-center gap-1 border px-2 py-1 cursor-pointer transition-all bg-transparent hover:animate-pulse"
                                                style={{
                                                  borderColor: `${roleColor}40`,
                                                  color: roleColor,
                                                }}
                                                onClick={() => {
                                                  setRoleToToggle({
                                                    roleId: role.id,
                                                    roleKey,
                                                    roleName: role.name,
                                                    schoolId: schoolId,
                                                    schoolName: schoolName,
                                                    isAdding: true,
                                                  });
                                                  setIsToggleRoleDialogOpen(
                                                    true
                                                  );
                                                }}
                                              >
                                                <RoleIcon
                                                  className="h-4 w-4"
                                                  style={{ color: roleColor }}
                                                />
                                                {role.name}
                                              </Badge>
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

              {activeTab === "history" && (
                <UserHistoryTab
                  user={user}
                  historySubTab={historySubTab}
                  onHistorySubTabChange={updateHistorySubTab}
                  updateLogUsers={updateLogUsers}
                />
              )}
            </div>
          </main>
        </div>
      </SheetContent>

      {/* Add Role Dialog */}
      <Dialog
        open={addRoleFromUrl}
        onOpenChange={(open) => {
          if (!open) {
            // Clear query params when dialog closes
            const params = new URLSearchParams();
            const userId = searchParams.get("id");
            if (userId) params.set("id", userId);
            const currentTab = searchParams.get("tab") || "details";
            params.set("tab", currentTab);
            const historyTab = searchParams.get("historyTab");
            if (historyTab) params.set("historyTab", historyTab);
            // Preserve other params
            for (const [key, value] of searchParams.entries()) {
              if (
                key !== "id" &&
                key !== "tab" &&
                key !== "historyTab" &&
                key !== "addRole" &&
                key !== "schoolId"
              ) {
                params.set(key, value);
              }
            }
            router.replace(`${pathname}?${params.toString()}`, {
              scroll: false,
            });
            // Reset form
            setSelectedRoleId("");
            setSelectedSchoolId("");
            setAssignRoleError(null);
          }
        }}
      >
        <DialogContent
          className="sm:max-w-md max-h-[65vh] flex flex-col"
          showCloseButton={false}
        >
          {assignRoleError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{assignRoleError}</AlertDescription>
            </Alert>
          )}

          {userHasPlatformRole && (
            <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 mb-4">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-200">
                Platform Role Restriction
              </AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                This user is a '{platformRoleName}' and can only have one role.
                They cannot have any other roles.
              </AlertDescription>
            </Alert>
          )}

          {userHasSchoolRole && !userHasPlatformRole && (
            <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 mb-4">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-200">
                School Role Restriction
              </AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                This user has school roles and cannot have platform roles.
              </AlertDescription>
            </Alert>
          )}

          {/* Step 1: School Selection (if user has school roles) */}
          {!userHasPlatformRole &&
            addRoleStep === "school" &&
            userHasSchoolRole && (
              <>
                <DialogHeader className="text-center shrink-0">
                  <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
                    <SchoolIcon className="h-8 w-8" />
                    Select a School
                  </DialogTitle>
                  <DialogDescription className="text-center">
                    Choose which school this role belongs to.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="school-select">School *</Label>
                    {loadingSchools ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading schools...
                      </div>
                    ) : (
                      <Popover
                        open={schoolComboboxOpen}
                        onOpenChange={setSchoolComboboxOpen}
                        modal
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={schoolComboboxOpen}
                            className="w-full justify-between"
                            disabled={loadingSchools}
                          >
                            {selectedSchoolId
                              ? schools.find(
                                  (school) => school.id === selectedSchoolId
                                )?.name
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
                                {schools.map((school) => {
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
                                        setSelectedSchoolId(
                                          school.id === selectedSchoolId
                                            ? ""
                                            : school.id
                                        );
                                        setSchoolComboboxOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedSchoolId === school.id
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
                    )}
                  </div>
                </div>
              </>
            )}

          {/* Step 2: Role Selection */}
          {!userHasPlatformRole &&
            addRoleStep === "role" &&
            !selectedRoleId && (
              <>
                <DialogHeader className="text-center shrink-0">
                  <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
                    <ShieldCheck className="h-8 w-8" />
                    Select a Role
                  </DialogTitle>
                  <DialogDescription className="text-center">
                    Choose the role to assign to {getDisplayName(user)}.
                  </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 min-h-0">
                  <div className="py-2 pr-4">
                    {loadingRoles ? (
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <Card key={i} className="p-3">
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
                              <div className="h-4 w-full bg-muted rounded" />
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <>
                        {(() => {
                          const allRolesWithStatus = getAllRolesWithStatus();
                          const platformRoles = allRolesWithStatus.filter(
                            (item) =>
                              PLATFORM_ROLE_KEYS.includes(item.role.key || "")
                          );
                          const schoolRoles = allRolesWithStatus.filter(
                            (item) => {
                              const roleKey = item.role.key || "";
                              return (
                                roleKey.includes("SCHOOL") ||
                                roleKey.includes("TEACHER")
                              );
                            }
                          );

                          // Helper function to get role color styles
                          const getRoleColorStyles = (roleKey: string) => {
                            if (roleKey === "TEACHER") {
                              return {
                                textColor: "var(--role-teacher)",
                                bgColor: "var(--role-teacher)",
                              };
                            } else if (roleKey === "SCHOOL_ADMIN") {
                              return {
                                textColor: "var(--role-school-admin)",
                                bgColor: "var(--role-school-admin)",
                              };
                            } else if (roleKey === "SCHOOL_STAFF") {
                              return {
                                textColor: "var(--role-school-staff)",
                                bgColor: "var(--role-school-staff)",
                              };
                            } else if (roleKey === "SCHOOL_LICENCE") {
                              return {
                                textColor: "var(--role-school-licence)",
                                bgColor: "var(--role-school-licence)",
                              };
                            } else if (roleKey === "PLATFORM_ADMIN") {
                              return {
                                textColor: "var(--role-platform-admin)",
                                bgColor: "var(--role-platform-admin)",
                              };
                            }
                            return {
                              textColor: "var(--foreground)",
                              bgColor: "var(--foreground)",
                            };
                          };

                          // Helper function to get role icon
                          const getRoleIcon = (roleKey: string) => {
                            if (roleKey === "TEACHER") {
                              return UsersIcon;
                            } else if (roleKey === "SCHOOL_LICENCE") {
                              return FileBadge2;
                            } else if (roleKey === "PLATFORM_ADMIN") {
                              return ShieldCheck;
                            }
                            return UsersIcon;
                          };

                          return (
                            <>
                              {platformRoles.length > 0 && (
                                <div className="space-y-2 mb-4">
                                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                    Platform Roles
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    {platformRoles.map(
                                      ({ role, isAvailable }) => {
                                        const isSelected =
                                          selectedRoleId === role.id;
                                        const roleKey = role.key || "";
                                        const { textColor, bgColor } =
                                          getRoleColorStyles(roleKey);
                                        const RoleIcon = getRoleIcon(roleKey);

                                        return (
                                          <Card
                                            key={role.id}
                                            className={cn(
                                              "p-3 cursor-pointer transition-all border relative",
                                              isSelected
                                                ? "border-primary shadow-md ring-2 ring-primary"
                                                : isAvailable
                                                  ? "hover:border-primary/50 hover:shadow-sm"
                                                  : "opacity-50"
                                            )}
                                            style={
                                              isAvailable
                                                ? {
                                                    backgroundColor: `color-mix(in srgb, ${bgColor} 5%, transparent)`,
                                                    borderColor: `color-mix(in srgb, ${bgColor} 25%, transparent)`,
                                                  }
                                                : {
                                                    backgroundColor: `var(--muted)`,
                                                    borderColor: `var(--border)`,
                                                  }
                                            }
                                            onClick={() => {
                                              if (isAvailable) {
                                                setSelectedRoleId(
                                                  isSelected ? "" : role.id
                                                );
                                              } else if (selectedSchoolId) {
                                                // If school is selected and role is unavailable, show confirmation dialog
                                                setUnavailableRoleToAssign({
                                                  roleId: role.id,
                                                  roleName: role.name,
                                                });
                                                setIsUnavailableRoleDialogOpen(
                                                  true
                                                );
                                              }
                                            }}
                                          >
                                            <div className="flex flex-col items-center gap-2">
                                              <div
                                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                                style={{
                                                  backgroundColor: isAvailable
                                                    ? `color-mix(in srgb, ${bgColor} 8%, transparent)`
                                                    : `var(--muted)`,
                                                }}
                                              >
                                                <RoleIcon
                                                  className="w-4 h-4"
                                                  style={{
                                                    color: isAvailable
                                                      ? textColor
                                                      : `var(--muted-foreground)`,
                                                  }}
                                                />
                                              </div>
                                              <div
                                                className="text-sm font-medium text-center truncate w-full"
                                                style={{
                                                  color: isAvailable
                                                    ? textColor
                                                    : `var(--muted-foreground)`,
                                                }}
                                              >
                                                {role.name}
                                              </div>
                                              {!isAvailable && (
                                                <Check className="h-4 w-4 text-muted-foreground absolute top-1 right-1" />
                                              )}
                                              {isSelected && isAvailable && (
                                                <Check className="h-4 w-4 text-primary absolute top-1 right-1" />
                                              )}
                                            </div>
                                          </Card>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>
                              )}
                              {schoolRoles.length > 0 && (
                                <div className="space-y-2">
                                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                    School Roles
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    {schoolRoles.map(
                                      ({ role, isAvailable }) => {
                                        const isSelected =
                                          selectedRoleId === role.id;
                                        const roleKey = role.key || "";
                                        const { textColor, bgColor } =
                                          getRoleColorStyles(roleKey);
                                        const RoleIcon = getRoleIcon(roleKey);

                                        return (
                                          <Card
                                            key={role.id}
                                            className={cn(
                                              "p-3 cursor-pointer transition-all border relative",
                                              isSelected
                                                ? "border-primary shadow-md ring-2 ring-primary"
                                                : isAvailable
                                                  ? "hover:border-primary/50 hover:shadow-sm"
                                                  : "opacity-50"
                                            )}
                                            style={
                                              isAvailable
                                                ? {
                                                    backgroundColor: `color-mix(in srgb, ${bgColor} 5%, transparent)`,
                                                    borderColor: `color-mix(in srgb, ${bgColor} 25%, transparent)`,
                                                  }
                                                : {
                                                    backgroundColor: `var(--muted)`,
                                                    borderColor: `var(--border)`,
                                                  }
                                            }
                                            onClick={() => {
                                              if (isAvailable) {
                                                setSelectedRoleId(
                                                  isSelected ? "" : role.id
                                                );
                                              } else if (selectedSchoolId) {
                                                // If school is selected and role is unavailable, show confirmation dialog
                                                setUnavailableRoleToAssign({
                                                  roleId: role.id,
                                                  roleName: role.name,
                                                });
                                                setIsUnavailableRoleDialogOpen(
                                                  true
                                                );
                                              }
                                            }}
                                          >
                                            <div className="flex flex-col items-center gap-2">
                                              <div
                                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                                style={{
                                                  backgroundColor: isAvailable
                                                    ? `color-mix(in srgb, ${bgColor} 8%, transparent)`
                                                    : `var(--muted)`,
                                                }}
                                              >
                                                <RoleIcon
                                                  className="w-4 h-4"
                                                  style={{
                                                    color: isAvailable
                                                      ? textColor
                                                      : `var(--muted-foreground)`,
                                                  }}
                                                />
                                              </div>
                                              <div
                                                className="text-sm font-medium text-center truncate w-full"
                                                style={{
                                                  color: isAvailable
                                                    ? textColor
                                                    : `var(--muted-foreground)`,
                                                }}
                                              >
                                                {role.name}
                                              </div>
                                              {!isAvailable && (
                                                <Check className="h-4 w-4 text-muted-foreground absolute top-1 right-1" />
                                              )}
                                              {isSelected && isAvailable && (
                                                <Check className="h-4 w-4 text-primary absolute top-1 right-1" />
                                              )}
                                            </div>
                                          </Card>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}

          {/* Step 3: Confirmation with ID Badge */}
          {selectedRole && addRoleStep === "confirm" && (
            <>
              <DialogHeader className="text-center shrink-0">
                <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
                  <ShieldCheck className="h-8 w-8" />
                  Confirm Role Assignment
                </DialogTitle>
                <DialogDescription className="text-center">
                  Review the role you're about to assign to{" "}
                  {getDisplayName(user)}.
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-center py-8">
                <div className="w-full max-w-sm border-2 border-border rounded-lg p-6 bg-card shadow-lg">
                  <div className="space-y-4">
                    {/* Name */}
                    <div className="text-center">
                      <h2 className="text-2xl font-bold">
                        {getDisplayName(user)}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {user?.email}
                      </p>
                    </div>

                    {/* Role Badge */}
                    {selectedRole &&
                      (() => {
                        const roleKey = selectedRole.key || "";
                        const isAdmin =
                          roleKey.includes("ADMIN") ||
                          roleKey.includes("admin");
                        let badgeStyle: {
                          backgroundColor?: string;
                          color?: string;
                        } = {};

                        if (roleKey === "PLATFORM_ADMIN") {
                          badgeStyle = {
                            backgroundColor: "#ff7f00",
                            color: "white",
                          };
                        } else if (roleKey === "TEACHER") {
                          badgeStyle = {
                            backgroundColor: "#048393",
                            color: "white",
                          };
                        } else if (roleKey === "SCHOOL_ADMIN") {
                          badgeStyle = {
                            backgroundColor: "blue",
                            color: "white",
                          };
                        } else if (roleKey === "SCHOOL_LICENCE") {
                          badgeStyle = {
                            backgroundColor: "#6b7280",
                            color: "white",
                          };
                        }

                        let RoleIcon = ShieldCheck;
                        if (roleKey === "TEACHER") {
                          RoleIcon = UsersIcon;
                        } else if (roleKey === "SCHOOL_LICENCE") {
                          RoleIcon = FileBadge2;
                        }

                        return (
                          <div className="flex justify-center">
                            <Badge
                              variant="default"
                              className="flex items-center gap-2 px-4 py-2 text-base"
                              style={badgeStyle}
                            >
                              {isAdmin ? (
                                <ShieldCheck className="h-4 w-4" />
                              ) : roleKey === "SCHOOL_LICENCE" ? (
                                <FileBadge2 className="h-4 w-4" />
                              ) : (
                                <UsersIcon className="h-4 w-4" />
                              )}
                              {selectedRole.name}
                            </Badge>
                          </div>
                        );
                      })()}

                    {/* School (if applicable) */}
                    {selectedSchoolId &&
                      (() => {
                        const selectedSchool = schools.find(
                          (s) => s.id === selectedSchoolId
                        );
                        return selectedSchool ? (
                          <div className="text-center pt-2 border-t">
                            <p className="text-sm font-medium text-muted-foreground">
                              {selectedSchool.name}
                            </p>
                          </div>
                        ) : null;
                      })()}
                  </div>
                </div>
              </div>
            </>
          )}

          <DialogFooter className="shrink-0">
            <div className="flex w-full items-center justify-center gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  if (addRoleStep === "role") {
                    // Go back to school selection
                    setAddRoleStep("school");
                    setSelectedRoleId("");
                  } else if (addRoleStep === "confirm") {
                    // Go back to role selection
                    setAddRoleStep("role");
                  } else {
                    // Close dialog
                    const params = new URLSearchParams();
                    const userId = searchParams.get("id");
                    if (userId) params.set("id", userId);
                    const currentTab = searchParams.get("tab") || "details";
                    params.set("tab", currentTab);
                    const historyTab = searchParams.get("historyTab");
                    if (historyTab) params.set("historyTab", historyTab);
                    // Preserve other params
                    for (const [key, value] of searchParams.entries()) {
                      if (
                        key !== "id" &&
                        key !== "tab" &&
                        key !== "historyTab" &&
                        key !== "addRole" &&
                        key !== "schoolId"
                      ) {
                        params.set(key, value);
                      }
                    }
                    router.replace(`${pathname}?${params.toString()}`, {
                      scroll: false,
                    });
                    setSelectedRoleId("");
                    setSelectedSchoolId("");
                    setAssignRoleError(null);
                    setAddRoleStep(
                      userHasSchoolRole && !userHasPlatformRole
                        ? "school"
                        : "role"
                    );
                  }
                }}
              >
                {addRoleStep === "role"
                  ? "Back"
                  : addRoleStep === "confirm"
                    ? "Back"
                    : "Cancel"}
              </Button>
              {addRoleStep === "school" && selectedSchoolId && (
                <Button
                  onClick={() => setAddRoleStep("role")}
                  className="bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90"
                >
                  Next
                </Button>
              )}
              {addRoleStep === "role" && selectedRoleId && (
                <Button
                  onClick={() => {
                    const selectedRole = roles.find(
                      (r) => r.id === selectedRoleId
                    );
                    if (!selectedRole) return;

                    const roleKey = selectedRole.key || "";
                    const requiresSchool =
                      roleKey === "TEACHER" ||
                      roleKey === "SCHOOL_ADMIN" ||
                      roleKey === "SCHOOL_STAFF" ||
                      roleKey === "SCHOOL_LICENCE";

                    if (requiresSchool && !selectedSchoolId) {
                      setAssignRoleError(
                        "This role requires a school to be selected"
                      );
                      return;
                    }
                    setAddRoleStep("confirm");
                  }}
                  disabled={(() => {
                    const selectedRole = roles.find(
                      (r) => r.id === selectedRoleId
                    );
                    if (!selectedRole) return true;
                    const roleKey = selectedRole.key || "";
                    const requiresSchool =
                      roleKey === "TEACHER" ||
                      roleKey === "SCHOOL_ADMIN" ||
                      roleKey === "SCHOOL_STAFF" ||
                      roleKey === "SCHOOL_LICENCE";
                    return requiresSchool && !selectedSchoolId;
                  })()}
                  className="bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90"
                >
                  Next
                </Button>
              )}
              {addRoleStep === "confirm" && selectedRoleId && (
                <Button
                  onClick={handleAddRole}
                  disabled={
                    isAssigningRole ||
                    assignRoleSuccess ||
                    (roleRequiresSchool && !selectedSchoolId)
                  }
                  className={cn(
                    "text-white",
                    assignRoleSuccess
                      ? "bg-green-600 hover:bg-green-600"
                      : "bg-[var(--brand-bullyproof-primary)] hover:bg-[var(--brand-bullyproof-primary)]/90"
                  )}
                >
                  {isAssigningRole ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : assignRoleSuccess ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Assigned!
                    </>
                  ) : (
                    "Assign Role"
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Assign Unavailable Role Confirmation Dialog */}
      <AlertDialog
        open={isUnavailableRoleDialogOpen}
        onOpenChange={setIsUnavailableRoleDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Role</AlertDialogTitle>
            <AlertDialogDescription>
              You're about to give the role{" "}
              <strong>{unavailableRoleToAssign?.roleName}</strong> to{" "}
              {getDisplayName(user)}.
              {selectedSchoolId &&
                (() => {
                  const selectedSchool = schools.find(
                    (s) => s.id === selectedSchoolId
                  );
                  return selectedSchool ? (
                    <>
                      {" "}
                      This role will be assigned at{" "}
                      <strong>{selectedSchool.name}</strong>.
                    </>
                  ) : null;
                })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsUnavailableRoleDialogOpen(false);
                setUnavailableRoleToAssign(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAssignUnavailableRole}
              disabled={isAssigningRole}
              className="bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90"
            >
              {isAssigningRole ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "OK"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Role Confirmation Dialog */}
      <AlertDialog
        open={isToggleRoleDialogOpen && !!roleToToggle}
        onOpenChange={(open) => {
          setIsToggleRoleDialogOpen(open);
          if (!open) {
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
