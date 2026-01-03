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
import type { roles } from "@/server/db/schema";
import type { School } from "@/entities/school/model/types";
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  
  // Add role dialog state
  const [isAddRoleDialogOpen, setIsAddRoleDialogOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [isAssigningRole, setIsAssigningRole] = useState(false);
  
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
        const result = await schoolApi.get.listSchools({ limit: 1000 });
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

  const getFullName = (user: UserWithRolesAndSchools) => {
    const parts = [user.firstName, user.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : user.email;
  };

  const isSchoolLicenceAccount = (user: UserWithRolesAndSchools) => {
    return user.schoolRoles.some((sr) => sr.roleKey === "SCHOOL_LICENCE");
  };

  const getDisplayName = (user: UserWithRolesAndSchools) => {
    if (isSchoolLicenceAccount(user)) {
      const licenceSchoolRole = user.schoolRoles.find(
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

  // Get available roles that the user doesn't already have
  const getAvailableRoles = () => {
    if (!user) return [];
    
    // Platform roles the user already has (these are unique, can't have duplicates)
    const userPlatformRoleKeys = new Set(user.platformRoles);

    return roles.filter((role) => {
      const roleKey = role.key || "";
      
      // Check if this is typically a platform role
      const isPlatformRole = !roleKey.includes("SCHOOL") && !roleKey.includes("TEACHER");
      
      if (isPlatformRole) {
        // For platform roles, filter out if user already has it
        return !userPlatformRoleKeys.has(roleKey);
      } else {
        // For school roles, allow them to be assigned to different schools
        // The backend will prevent duplicates at the same school
        return true;
      }
    });
  };

  const handleAddRole = async () => {
    if (!user || !selectedRoleId) return;

    const selectedRole = roles.find((r) => r.id === selectedRoleId);
    if (!selectedRole) return;

    // Determine if this is a platform or school role
    // We'll check if the role scope is "platform" or if it's typically a platform role
    const isPlatformRole = !selectedSchoolId;
    
    // For school roles, we need schoolId
    if (!isPlatformRole && !selectedSchoolId) {
      alert("Please select a school for school roles");
      return;
    }

    try {
      setIsAssigningRole(true);
      const result = await rolesApi.post.assignRole({
        userId: user.id,
        roleId: selectedRoleId,
        schoolId: selectedSchoolId || undefined,
      });

      if (result.error) {
        alert(result.error.message || "Failed to assign role");
        return;
      }

      // Reset form and close dialog
      setSelectedRoleId("");
      setSelectedSchoolId("");
      setIsAddRoleDialogOpen(false);
      
      // Refresh user data
      onUserUpdate?.();
    } catch (err: any) {
      console.error("Failed to assign role:", err);
      alert(err.message || "Failed to assign role");
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
  
  // Determine if role typically requires a school based on role key
  // Roles with SCHOOL or TEACHER in the key are typically school roles
  const roleRequiresSchool = selectedRole
    ? (selectedRole.key?.includes("SCHOOL") ||
        selectedRole.key?.includes("TEACHER")) ?? false
    : false;
  
  // Get platform vs school roles for display
  const platformRoles = getAvailableRoles().filter((role) => {
    // Platform roles typically don't have school-specific keys
    return !role.key?.includes("SCHOOL") && !role.key?.includes("TEACHER");
  });
  
  const schoolRoles = getAvailableRoles().filter((role) => {
    return role.key?.includes("SCHOOL") || role.key?.includes("TEACHER");
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
              <p className="text-xs text-muted-foreground">
                {user.email}
              </p>
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
                      onClick={() => setEditing(!editing)}
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
                        <p className="text-sm">
                          {user.firstName || "—"}
                        </p>
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
                        <p className="text-sm">
                          {user.lastName || "—"}
                        </p>
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

                  {editing && (
                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditing(false);
                          setFirstName(user.firstName || "");
                          setLastName(user.lastName || "");
                          setEmail(user.email || "");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          // TODO: Implement update user API call
                          setEditing(false);
                          onUserUpdate?.();
                        }}
                      >
                        Save Changes
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddRoleDialogOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add New Role
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Platform Roles */}
                  {user.platformRoles.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Platform Roles</h4>
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
                          if (
                            roleKey === "PLATFORM_ADMIN"
                          ) {
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
                                  handleRemoveRoleClick(
                                    roleKey,
                                    roleName,
                                    true
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

                  {/* School Roles */}
                  {user.schoolRoles.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">School Roles</h4>
                      <div className="space-y-2">
                        {user.schoolRoles.map((schoolRole, idx) => {
                          const roleName =
                            schoolRole.roleName || schoolRole.roleKey || "Unknown";
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
      <Dialog open={isAddRoleDialogOpen} onOpenChange={setIsAddRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Role</DialogTitle>
            <DialogDescription>
              Select a role to assign to {getDisplayName(user)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                      No available roles
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedRole && (
              <div className="space-y-2">
                <Label htmlFor="school-select">
                  School {roleRequiresSchool && <span className="text-destructive">*</span>}
                </Label>
                <Select
                  value={selectedSchoolId}
                  onValueChange={setSelectedSchoolId}
                >
                  <SelectTrigger id="school-select">
                    <SelectValue placeholder={roleRequiresSchool ? "Select a school (required)" : "Select a school (optional)"} />
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
