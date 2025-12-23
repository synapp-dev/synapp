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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Search, Users, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";

function AdminUsersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<UserWithRolesAndSchools[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Get filters from URL query params
  const roleFilter = searchParams?.get("role") || "";
  const schoolFilter = searchParams?.get("schoolId") || "";

  // Extract unique schools from users data
  const availableSchools = Array.from(
    new Map(
      users
        .flatMap((user) => user.schoolRoles)
        .filter((sr) => sr.schoolId && sr.schoolName)
        .map((sr) => [sr.schoolId, { id: sr.schoolId, name: sr.schoolName! }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Filter roles to only show roles that have a key (for filtering)
  const availableRoles = roles
    .filter((role) => role.key)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

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

  useEffect(() => {
    loadUsers(searchTerm, roleFilter || undefined, schoolFilter || undefined);
  }, [searchTerm, roleFilter, schoolFilter, loadUsers]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
  };

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

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.[0]?.toUpperCase() || "";
    const last = lastName?.[0]?.toUpperCase() || "";
    return first + last || "?";
  };

  const getFullName = (user: UserWithRolesAndSchools) => {
    const parts = [user.firstName, user.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : user.email;
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          Manage and view all platform users with their roles and schools
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                {users.length} user{users.length !== 1 ? "s" : ""} found
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={roleFilter || "all"}
                onValueChange={handleRoleFilterChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.key || ""}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={schoolFilter || "all"}
                onValueChange={handleSchoolFilterChange}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by school" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {availableSchools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                className="w-[300px]"
              />
              <Button onClick={handleSearch} variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {users.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No users found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm
                  ? "Try adjusting your search criteria"
                  : "No users are registered on the platform yet"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Schools</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  // Combine all roles (platform + school roles)
                  const allRoles: Array<{ name: string; isAdmin: boolean }> =
                    [];

                  // Add platform roles
                  user.platformRoles.forEach((role) => {
                    const isAdmin =
                      role.includes("ADMIN") || role.includes("admin");
                    allRoles.push({ name: role, isAdmin });
                  });

                  // Add school roles (deduplicate by role key)
                  const schoolRoleKeys = new Set<string>();
                  user.schoolRoles.forEach((schoolRole) => {
                    if (
                      schoolRole.roleKey &&
                      !schoolRoleKeys.has(schoolRole.roleKey)
                    ) {
                      schoolRoleKeys.add(schoolRole.roleKey);
                      const isAdmin =
                        schoolRole.roleKey.includes("ADMIN") ||
                        schoolRole.roleKey.includes("admin");
                      allRoles.push({ name: schoolRole.roleKey, isAdmin });
                    }
                  });

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatarUrl || undefined} />
                            <AvatarFallback>
                              {getInitials(user.firstName, user.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {getFullName(user)}
                            </div>
                            {user.firstName && user.lastName && (
                              <div className="text-sm text-muted-foreground">
                                {user.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {allRoles.length > 0 ? (
                            allRoles.map((role, idx) => (
                              <Badge
                                key={idx}
                                variant="default"
                                className="flex items-center gap-1"
                              >
                                {role.isAdmin ? (
                                  <ShieldCheck className="h-3 w-3" />
                                ) : (
                                  <Users className="h-3 w-3" />
                                )}
                                {role.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              None
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 max-w-md">
                          {user.schoolRoles.length > 0 ? (
                            user.schoolRoles.map((schoolRole, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2"
                              >
                                <Users className="h-3 w-3 text-muted-foreground" />
                                <Badge variant="outline" className="text-xs">
                                  {schoolRole.schoolName || "Unknown School"}
                                </Badge>
                              </div>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              None
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString()
                            : "N/A"}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
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
