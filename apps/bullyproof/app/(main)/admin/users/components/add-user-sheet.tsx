"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@workspace/ui/components/sheet";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { rolesApi } from "@/entities/roles/api/endpoints";
import { schoolApi } from "@/entities/school/api/endpoints";
import { apiFetch } from "@/lib/api/fetcher.client";
import type { roles } from "@/server/db/schema";
import type { School } from "@/entities/school/model/useListSchoolsQuery";
import { Loader2, AlertCircle } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";

type Role = typeof roles.$inferSelect;

interface AddUserSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated?: () => void;
}

export function AddUserSheet({
  open,
  onOpenChange,
  onUserCreated,
}: AddUserSheetProps) {
  const [email, setEmail] = useState("");
  const [roleScope, setRoleScope] = useState<"platform" | "school" | "">("");
  const [schoolId, setSchoolId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load roles and schools on mount
  useEffect(() => {
    if (open) {
      loadRoles();
      loadSchools();
    }
  }, [open]);

  // Reset form when sheet closes
  useEffect(() => {
    if (!open) {
      setEmail("");
      setRoleScope("");
      setSchoolId("");
      setRoleName("");
      setError(null);
    }
  }, [open]);

  // Filter roles based on selected scope
  useEffect(() => {
    if (roleScope && roleName) {
      // If scope changes, reset role name if current role doesn't match scope
      const selectedRole = roles.find((r) => r.name === roleName);
      if (selectedRole) {
        const roleScopeId = selectedRole.scopeId;
        // Check if role matches the selected scope
        // We need to check the scope name, not the scopeId
        // For now, we'll filter roles by checking if they're platform or school roles
        const isPlatformRole =
          !selectedRole.key?.includes("SCHOOL") &&
          !selectedRole.key?.includes("TEACHER");
        const roleMatchesScope =
          (roleScope === "platform" && isPlatformRole) ||
          (roleScope === "school" && !isPlatformRole);

        if (!roleMatchesScope) {
          setRoleName("");
        }
      }
    }
  }, [roleScope, roles, roleName]);

  const loadRoles = async () => {
    try {
      setLoadingRoles(true);
      // Load all roles - we'll filter by scope client-side
      const result = await rolesApi.get.list();
      if (result.data) {
        setRoles(result.data);
      } else if (result.error) {
        setError(result.error.message || "Failed to load roles");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load roles");
    } finally {
      setLoadingRoles(false);
    }
  };

  const loadSchools = async () => {
    try {
      setLoadingSchools(true);
      const result = await schoolApi.get.listSchools({ limit: 100 });
      if (result.data) {
        setSchools(result.data);
      } else if (result.error) {
        setError(result.error.message || "Failed to load schools");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load schools");
    } finally {
      setLoadingSchools(false);
    }
  };

  // Filter roles by scope
  // Note: We filter client-side by checking role keys since scopeId is a UUID
  // Platform roles typically don't have SCHOOL or TEACHER in their key
  const getFilteredRoles = () => {
    if (!roleScope) return [];

    return roles
      .filter((role) => {
        const roleKey = role.key || "";
        const isPlatformRole =
          !roleKey.includes("SCHOOL") && !roleKey.includes("TEACHER");
        return roleScope === "platform" ? isPlatformRole : !isPlatformRole;
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !roleScope || !roleName) {
      setError("Please fill in all required fields");
      return;
    }

    if (roleScope === "school" && !schoolId) {
      setError("Please select a school for school-scoped roles");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if the selected role is Platform Admin
      const selectedRole = roles.find((r) => r.name === roleName);
      const isPlatformAdmin = selectedRole?.key === "PLATFORM_ADMIN";

      // Route to platform-admin endpoint if creating a platform admin
      const endpoint = isPlatformAdmin
        ? "/users/new/platform-admin"
        : "/users/new";

      type CreateUserResponse = {
        userId: string;
        email: string;
        roleName: string;
        roleScope: string;
        schoolId?: string;
      };

      const result = await apiFetch<CreateUserResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify({
          email,
          roleScope,
          schoolId: roleScope === "school" ? schoolId : undefined,
          roleName,
        }),
      });

      // Check for error using type narrowing
      if (result.data === null) {
        const errorObj = result as { error: { message: string } | string };
        const errorMessage =
          typeof errorObj.error === "object"
            ? errorObj.error.message
            : typeof errorObj.error === "string"
              ? errorObj.error
              : "Failed to create user";
        throw new Error(errorMessage);
      }

      // Reset form
      setEmail("");
      setRoleScope("");
      setSchoolId("");
      setRoleName("");

      // Close sheet and refresh
      onOpenChange(false);
      onUserCreated?.();
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const filteredRoles = getFilteredRoles();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className="w-full max-w-2xl mx-auto rounded-b-2xl border-b-2 border-l-2 border-r-2 border-border/50 shadow-2xl p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>Add New User</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-6 space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleScope">Role Scope *</Label>
              <Select
                value={roleScope}
                onValueChange={(value) => {
                  setRoleScope(value as "platform" | "school");
                  // Reset school and role when scope changes
                  setSchoolId("");
                  setRoleName("");
                }}
                disabled={loading || loadingRoles}
              >
                <SelectTrigger id="roleScope">
                  <SelectValue placeholder="Select role scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">Platform</SelectItem>
                  <SelectItem value="school">School</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {roleScope === "school" && (
              <div className="space-y-2">
                <Label htmlFor="school">School *</Label>
                <Select
                  value={schoolId}
                  onValueChange={(value) => {
                    setSchoolId(value);
                    // Reset role when school changes
                    setRoleName("");
                  }}
                  disabled={loading || loadingSchools}
                >
                  <SelectTrigger id="school">
                    <SelectValue placeholder="Select a school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="roleName">Role Name *</Label>
              {loadingRoles ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading roles...
                </div>
              ) : (
                <Select
                  value={roleName}
                  onValueChange={setRoleName}
                  disabled={loading || !roleScope || filteredRoles.length === 0}
                >
                  <SelectTrigger id="roleName">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredRoles.map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {roleScope && filteredRoles.length === 0 && !loadingRoles && (
                <p className="text-sm text-muted-foreground">
                  No roles available for {roleScope} scope
                </p>
              )}
            </div>
          </div>

          <SheetFooter className="px-6 py-4 border-t gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
