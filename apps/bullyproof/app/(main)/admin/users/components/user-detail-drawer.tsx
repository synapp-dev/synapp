"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@workspace/ui/components/label";
import { Button } from "@workspace/ui/components/button";
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
  meApi,
  type UserWithRolesAndSchools,
} from "@/entities/me/api/endpoints";
import { rolesApi } from "@/entities/roles/api/endpoints";
import { schoolApi } from "@/entities/school/api/endpoints";
import { usersApi } from "@/entities/users/api/endpoints";
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
} from "lucide-react";

type Role = typeof roles.$inferSelect;

interface UserDetailDrawerProps {
  user: UserWithRolesAndSchools | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdate?: () => void;
}

function UserDetailDrawerContent({
  user,
  open,
  onOpenChange,
  onUserUpdate,
}: UserDetailDrawerProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // Add role dialog state
  const [isAddRoleDialogOpen, setIsAddRoleDialogOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [isAssigningRole, setIsAssigningRole] = useState(false);
  const [assignRoleError, setAssignRoleError] = useState<string | null>(null);

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

  // Load roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoadingRoles(true);
        const result = await rolesApi.get.list();
        if (result.data) {
          setRoles(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch roles:", err);
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, []);

  // Load schools on mount
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        setLoadingSchools(true);
        const result = await schoolApi.get.listSchools({ limit: 100 });
        if (result.data) {
          setSchools(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch schools:", err);
      } finally {
        setLoadingSchools(false);
      }
    };
    fetchSchools();
  }, []);

  // Initialize form when user changes
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.[0]?.toUpperCase() || "";
    const last = lastName?.[0]?.toUpperCase() || "";
    return first + last || "?";
  };

  const getFullName = (user: UserWithRolesAndSchools | null) => {
    if (!user) return "Unknown User";
    const parts = [user.firstName, user.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : user.email || "Unknown User";
  };

  const isSchoolLicenceAccount = (user: UserWithRolesAndSchools | null) => {
    if (!user || !user.schoolRoles) return false;
    return user.schoolRoles.some((sr) => sr.roleKey === "SCHOOL_LICENCE");
  };

  const getDisplayName = (user: UserWithRolesAndSchools | null) => {
    if (!user) return "Unknown User";
    if (isSchoolLicenceAccount(user)) {
      const licenceSchoolRole = user.schoolRoles?.find(
        (sr) => sr.roleKey === "SCHOOL_LICENCE"
      );
      const schoolName = licenceSchoolRole?.schoolName || "Unknown School";
      return `${schoolName} (LICENCE)`;
    }
    return getFullName(user);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Platform role keys
  const PLATFORM_ROLE_KEYS = [
    "PLATFORM_ADMIN",
    "GOVERNMENT_VIEWER",
    "PLATFORM_STAFF",
  ];

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

  // Get available roles that the user doesn't already have
  const getAvailableRoles = () => {
    if (!user) return [];

    // Platform roles the user already has
    const userPlatformRoleKeys = new Set(user.platformRoles || []);

    // Check if role is a platform role
    const isPlatformRole = (roleKey: string) =>
      PLATFORM_ROLE_KEYS.includes(roleKey);

    // Check if role is a school role
    const isSchoolRole = (roleKey: string) =>
      roleKey.includes("SCHOOL") || roleKey.includes("TEACHER");

    return roles.filter((role) => {
      const roleKey = role.key || "";
      const isAssigningPlatformRole = isPlatformRole(roleKey);
      const isAssigningSchoolRole = isSchoolRole(roleKey);

      // If user has platform role, they can only have that one role
      if (userHasPlatformRole) {
        // Only allow the platform role they already have
        return userPlatformRoleKeys.has(roleKey);
      }

      // If user has school roles, they cannot have platform roles
      if (userHasSchoolRole && isAssigningPlatformRole) {
        return false;
      }

      // If assigning platform role and user has any roles, prevent it
      if (
        isAssigningPlatformRole &&
        (userHasPlatformRole || userHasSchoolRole)
      ) {
        return false;
      }

      // For platform roles, filter out if user already has it
      if (isAssigningPlatformRole) {
        return !userPlatformRoleKeys.has(roleKey);
      }

      // For school roles, check SCHOOL_LICENCE exclusivity
      if (isAssigningSchoolRole) {
        const isSchoolLicenceRole = roleKey === "SCHOOL_LICENCE";

        // If user has SCHOOL_LICENCE, they cannot have other school roles
        if (userHasSchoolLicence && !isSchoolLicenceRole) {
          return false;
        }

        // If user has other school roles, they cannot have SCHOOL_LICENCE
        if (userHasNonLicenceSchoolRole && isSchoolLicenceRole) {
          return false;
        }
      }

      // For school roles, allow them to be assigned to different schools
      // The backend will prevent duplicates at the same school
      return true;
    });
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
        return;
      }

      // Reset form and close dialog
      setSelectedRoleId("");
      setSelectedSchoolId("");
      setAssignRoleError(null);
      setIsAddRoleDialogOpen(false);

      // Refresh user data
      onUserUpdate?.();
    } catch (err: any) {
      console.error("Failed to assign role:", err);
      const errorMessage = err.message || "Failed to assign role";
      setAssignRoleError(errorMessage);
    } finally {
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
        className="h-[95vh] w-full max-w-4xl mx-auto rounded-t-2xl border-t-2 border-l-2 border-r-2 border-border/50 shadow-2xl p-0 overflow-hidden flex flex-col"
      >
        <SheetTitle className="sr-only">
          {getDisplayName(user)} - User Details
        </SheetTitle>
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left Sidebar */}
          <div className="hidden md:flex flex-col w-48 border-r shrink-0">
            {/* User Info Header */}
            <div className="p-4 border-b shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback>
                    {getInitials(user.firstName, user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="font-semibold text-xl truncate">
                  {getDisplayName(user)}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
            {/* Navigation Menu */}
            <div className="h-fit">
              <SidebarProvider className="items-start">
                <Sidebar collapsible="none" className="border-0">
                  <SidebarContent>
                    <SidebarGroup>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          <SidebarMenuItem>
                            <SidebarMenuButton isActive>
                              <User className="h-4 w-4" />
                              <span>Overview</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton>
                              <Settings className="h-4 w-4" />
                              <span>Settings</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </SidebarGroup>
                  </SidebarContent>
                </Sidebar>
              </SidebarProvider>
            </div>
          </div>

          {/* Right Content Area */}
          <main className="flex flex-1 flex-col overflow-hidden min-h-0">
            {/* Mobile Header */}
            <div className="md:hidden p-4 border-b shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback>
                    {getInitials(user.firstName, user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="font-semibold text-lg">
                  {getDisplayName(user)}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* User Information */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>User Information</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(!editing);
                        setSaveError(null);
                        if (user) {
                          setFirstName(user.firstName || "");
                          setLastName(user.lastName || "");
                          setEmail(user.email || "");
                        }
                      }}
                    >
                      {editing ? "Cancel" : "Edit"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      {editing ? (
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                        />
                      ) : (
                        <p className="text-sm">{user.firstName || "—"}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      {editing ? (
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                      ) : (
                        <p className="text-sm">{user.lastName || "—"}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    {editing ? (
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{user.email}</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Created</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </span>
                  </div>

                  {saveError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{saveError}</AlertDescription>
                    </Alert>
                  )}

                  {editing && (
                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditing(false);
                          setSaveError(null);
                          if (user) {
                            setFirstName(user.firstName || "");
                            setLastName(user.lastName || "");
                            setEmail(user.email || "");
                          }
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          if (!user) return;

                          try {
                            setSaving(true);
                            setSaveError(null);

                            const result = await usersApi.patch.update(
                              user.id,
                              {
                                firstName: firstName || undefined,
                                lastName: lastName || undefined,
                                email: email || undefined,
                              }
                            );

                            if (result.error) {
                              const errorMessage =
                                result.error.message || "Failed to update user";
                              throw new Error(errorMessage);
                            }

                            setEditing(false);
                            onUserUpdate?.();
                          } catch (err: any) {
                            console.error("Failed to update user:", err);
                            setSaveError(
                              err.message || "Failed to update user"
                            );
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Roles */}
              <Card className="mt-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Roles</CardTitle>
                    {!userHasPlatformRole && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddRoleDialogOpen(true)}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add New Role
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Warning alerts for restricted roles */}
                  {userHasPlatformRole && (
                    <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                      <AlertTitle className="text-yellow-800 dark:text-yellow-200">
                        Platform Role Restriction
                      </AlertTitle>
                      <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                        This user is a '{platformRoleName}' and can only have
                        one role. They cannot have any other roles.
                      </AlertDescription>
                    </Alert>
                  )}
                  {userHasSchoolRole && !userHasPlatformRole && (
                    <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
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
                  {/* Platform Roles */}
                  {user.platformRoles.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Platform Roles
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {user.platformRoles.map((roleKey, idx) => {
                          const role = roles.find((r) => r.key === roleKey);
                          const roleName = role?.name || roleKey;
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
                          }

                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-1 group"
                            >
                              <Badge
                                variant="default"
                                className="flex items-center gap-1"
                                style={badgeStyle}
                              >
                                {isAdmin ? (
                                  <ShieldCheck className="h-3 w-3" />
                                ) : (
                                  <UsersIcon className="h-3 w-3" />
                                )}
                                {roleName}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() =>
                                  handleRemoveRoleClick(roleKey, roleName, true)
                                }
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* School Roles */}
                  {user.schoolRoles.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">School Roles</h4>
                      <div className="space-y-2">
                        {user.schoolRoles.map((schoolRole, idx) => {
                          const roleName =
                            schoolRole.roleName ||
                            schoolRole.roleKey ||
                            "Unknown";
                          const isAdmin =
                            schoolRole.roleKey?.includes("ADMIN") ||
                            schoolRole.roleKey?.includes("admin");

                          let badgeStyle: {
                            backgroundColor?: string;
                            color?: string;
                          } = {};
                          if (schoolRole.roleKey === "TEACHER") {
                            badgeStyle = {
                              backgroundColor: "#048393",
                              color: "white",
                            };
                          } else if (schoolRole.roleKey === "SCHOOL_ADMIN") {
                            badgeStyle = {
                              backgroundColor: "blue",
                              color: "white",
                            };
                          } else if (schoolRole.roleKey === "SCHOOL_LICENCE") {
                            badgeStyle = {
                              backgroundColor: "#6b7280",
                              color: "white",
                            };
                          }

                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-2 flex-wrap group"
                            >
                              <Badge
                                variant="default"
                                className="flex items-center gap-1"
                                style={badgeStyle}
                              >
                                {schoolRole.roleKey === "SCHOOL_LICENCE" ? (
                                  <FileBadge2 className="h-3 w-3" />
                                ) : isAdmin ? (
                                  <ShieldCheck className="h-3 w-3" />
                                ) : (
                                  <UsersIcon className="h-3 w-3" />
                                )}
                                {roleName}
                              </Badge>
                              {schoolRole.schoolName && (
                                <Badge
                                  variant="outline"
                                  className="flex items-center gap-1 border-l-0 rounded-r-md rounded-l-none bg-muted text-muted-foreground pl-4 -ml-2 z-0"
                                >
                                  {schoolRole.schoolName}
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() =>
                                  handleRemoveRoleClick(
                                    schoolRole.roleKey || "",
                                    roleName,
                                    false,
                                    schoolRole.schoolId,
                                    schoolRole.schoolName || undefined
                                  )
                                }
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {user.platformRoles.length === 0 &&
                    user.schoolRoles.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No roles assigned
                      </p>
                    )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </SheetContent>

      {/* Add Role Dialog */}
      <Dialog
        open={isAddRoleDialogOpen}
        onOpenChange={(open) => {
          setIsAddRoleDialogOpen(open);
          if (!open) {
            // Reset form when dialog closes
            setSelectedRoleId("");
            setSelectedSchoolId("");
            setAssignRoleError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Role</DialogTitle>
            <DialogDescription>
              Select a role to assign to {getDisplayName(user)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {assignRoleError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{assignRoleError}</AlertDescription>
              </Alert>
            )}
            {userHasPlatformRole && (
              <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                <AlertTitle className="text-yellow-800 dark:text-yellow-200">
                  Platform Role Restriction
                </AlertTitle>
                <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                  This user is a '{platformRoleName}' and can only have one
                  role. They cannot have any other roles.
                </AlertDescription>
              </Alert>
            )}
            {userHasSchoolRole && !userHasPlatformRole && (
              <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                <AlertTitle className="text-yellow-800 dark:text-yellow-200">
                  School Role Restriction
                </AlertTitle>
                <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                  This user has school roles and cannot have platform roles.
                </AlertDescription>
              </Alert>
            )}
            {!userHasPlatformRole && (
              <div className="space-y-2">
                <Label htmlFor="role-select">Role</Label>
                <Select
                  value={selectedRoleId}
                  onValueChange={(value) => {
                    setSelectedRoleId(value);
                    // Reset school selection when role changes
                    setSelectedSchoolId("");
                  }}
                >
                  <SelectTrigger id="role-select">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {platformRoles.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Platform Roles
                        </div>
                        {platformRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {schoolRoles.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          School Roles
                        </div>
                        {schoolRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {getAvailableRoles().length === 0 && (
                      <SelectItem value="no-roles" disabled>
                        {user.platformRoles.length > 0 ||
                        user.schoolRoles.length > 0
                          ? "User has other roles and cannot be assigned PLATFORM_ADMIN or SCHOOL_LICENCE"
                          : "No available roles"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedRole && !userHasPlatformRole && (
              <div className="space-y-2">
                <Label htmlFor="school-select">
                  School{" "}
                  {roleRequiresSchool && (
                    <span className="text-destructive">*</span>
                  )}
                </Label>
                <Select
                  value={selectedSchoolId}
                  onValueChange={setSelectedSchoolId}
                >
                  <SelectTrigger id="school-select">
                    <SelectValue
                      placeholder={
                        roleRequiresSchool
                          ? "Select a school (required)"
                          : "Select a school (optional)"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                    {schools.length === 0 && (
                      <SelectItem value="no-schools" disabled>
                        No schools available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {roleRequiresSchool && !selectedSchoolId && (
                  <p className="text-xs text-destructive">
                    This role requires a school to be selected
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddRoleDialogOpen(false);
                setSelectedRoleId("");
                setSelectedSchoolId("");
              }}
            >
              Cancel
            </Button>
            {!userHasPlatformRole && (
              <Button
                onClick={handleAddRole}
                disabled={
                  !selectedRoleId ||
                  isAssigningRole ||
                  (roleRequiresSchool && !selectedSchoolId)
                }
              >
                {isAssigningRole ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Assign Role"
                )}
              </Button>
            )}
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
    </Sheet>
  );
}

export function UserDetailDrawer(props: UserDetailDrawerProps) {
  return <UserDetailDrawerContent {...props} />;
}
