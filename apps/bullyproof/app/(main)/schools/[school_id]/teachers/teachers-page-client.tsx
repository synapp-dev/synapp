"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Mail, Search, Users } from "lucide-react";
import {
  meApi,
  type UserWithRolesAndSchools,
} from "@/entities/me/api/endpoints";
import { useSchoolStore } from "@/stores/school-store";
import Link from "next/link";

// Simple fuzzy search function
function fuzzySearch(query: string, text: string): boolean {
  if (!query) return true;

  const queryLower = query.toLowerCase().trim();
  const textLower = text.toLowerCase();

  // Exact match
  if (textLower.includes(queryLower)) return true;

  // Fuzzy match: check if all characters in query appear in order in text
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === queryLower.length;
}

export default function TeachersPageClient() {
  const currentSchool = useSchoolStore((state) => state.currentSchool);
  const [users, setUsers] = useState<UserWithRolesAndSchools[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");

  useEffect(() => {
    async function fetchUsers() {
      // Use schoolId (UUID) directly, not slug
      const schoolId = currentSchool?.id;

      if (!schoolId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await meApi.get.listAllUsers({
          schoolId: schoolId,
          limit: 100, // Max allowed by API
        });

        if (!result.error && result.data) {
          // Note: API returns { users: [...], totalCount: number }
          setUsers(result.data.users);
        } else if (result.error) {
          console.error("Failed to fetch users:", result.error);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [currentSchool?.id]);

  // Filter users to only show those with TEACHER or SCHOOL_ADMIN roles (exclude SCHOOL_LICENCE only users)
  const usersWithValidRoles = useMemo(() => {
    const schoolId = currentSchool?.id;
    if (!schoolId) return users;

    return users.filter((user) => {
      const schoolRoles = user.schoolRoles.filter(
        (role) => role.schoolId === schoolId
      );
      // User must have at least one role that is TEACHER or SCHOOL_ADMIN
      return schoolRoles.some(
        (role) => role.roleKey === "TEACHER" || role.roleKey === "SCHOOL_ADMIN"
      );
    });
  }, [users, currentSchool?.id]);

  // Categorize roles for filter dropdown
  const categorizedRoles = useMemo(() => {
    const schoolId = currentSchool?.id;
    if (!schoolId)
      return { administrative: [], teaching: [], staff: [], other: [] };

    const roleMap = new Map<string, { roleKey: string; roleName: string }>();

    usersWithValidRoles.forEach((user) => {
      user.schoolRoles
        .filter(
          (role) =>
            role.schoolId === schoolId && role.roleKey !== "SCHOOL_LICENCE"
        )
        .forEach((role) => {
          const roleKey = role.roleKey || "";
          if (roleKey && !roleMap.has(roleKey)) {
            roleMap.set(roleKey, {
              roleKey,
              roleName: role.roleName || roleKey,
            });
          }
        });
    });

    const roles = Array.from(roleMap.values());

    // Categorize roles
    const administrative = roles.filter((r) => r.roleKey === "SCHOOL_ADMIN");
    const teaching = roles.filter((r) => r.roleKey === "TEACHER");
    const staff = roles.filter((r) => r.roleKey === "SCHOOL_STAFF");
    const other = roles.filter(
      (r) =>
        r.roleKey !== "SCHOOL_ADMIN" &&
        r.roleKey !== "TEACHER" &&
        r.roleKey !== "SCHOOL_STAFF"
    );

    return { administrative, teaching, staff, other };
  }, [usersWithValidRoles, currentSchool?.id]);

  // Filter users based on search query and role filter
  const filteredUsers = useMemo(() => {
    let filtered = usersWithValidRoles;

    // Apply role filter
    if (selectedRole !== "all") {
      const schoolId = currentSchool?.id;
      filtered = filtered.filter((user) => {
        if (!schoolId) return false;
        return user.schoolRoles.some(
          (role) =>
            role.schoolId === schoolId &&
            role.roleKey === selectedRole &&
            role.roleKey !== "SCHOOL_LICENCE"
        );
      });
    }

    // Apply search query filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((user) => {
        const fullName =
          `${user.firstName || ""} ${user.lastName || ""}`.trim();
        const email = user.email || "";

        return (
          fuzzySearch(searchQuery, fullName) ||
          fuzzySearch(searchQuery, email) ||
          user.schoolRoles.some((role) =>
            fuzzySearch(searchQuery, role.roleName || "")
          )
        );
      });
    }

    return filtered;
  }, [usersWithValidRoles, searchQuery, selectedRole, currentSchool?.id]);

  // Group filtered users by their actual roles
  const usersByRole = useMemo(() => {
    const schoolId = currentSchool?.id;
    if (!schoolId) return new Map<string, UserWithRolesAndSchools[]>();

    const roleMap = new Map<string, UserWithRolesAndSchools[]>();

    filteredUsers.forEach((user) => {
      const schoolRoles = user.schoolRoles.filter(
        (role) =>
          role.schoolId === schoolId && role.roleKey !== "SCHOOL_LICENCE"
      );

      // Add user to each role category they have
      schoolRoles.forEach((role) => {
        const roleKey = role.roleKey || "";
        const roleName = role.roleName || roleKey || "Unknown";

        if (!roleMap.has(roleName)) {
          roleMap.set(roleName, []);
        }

        // Only add user if not already in this role's array (avoid duplicates)
        const roleUsers = roleMap.get(roleName)!;
        if (!roleUsers.some((u) => u.id === user.id)) {
          roleUsers.push(user);
        }
      });
    });

    return roleMap;
  }, [filteredUsers, currentSchool?.id]);

  const getFullName = (user: UserWithRolesAndSchools) => {
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return `${firstName} ${lastName}`.trim() || user.email;
  };

  const getInitials = (user: UserWithRolesAndSchools) => {
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const getSchoolRoles = (user: UserWithRolesAndSchools) => {
    const schoolId = currentSchool?.id;
    if (!schoolId) return [];
    // Filter out SCHOOL_LICENCE role, only show TEACHER and SCHOOL_ADMIN
    return user.schoolRoles.filter(
      (role) => role.schoolId === schoolId && role.roleKey !== "SCHOOL_LICENCE"
    );
  };

  // Convert teacher name to URL-friendly slug
  const getTeacherSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, "-");
  };

  // Render teacher card component
  const renderTeacherCard = (user: UserWithRolesAndSchools) => {
    const fullName = getFullName(user);
    const schoolRoles = getSchoolRoles(user);
    const teacherSlug = getTeacherSlug(fullName);
    const schoolSlug = currentSchool?.slug || "";

    return (
      <Link
        href={`/schools/${schoolSlug}/teachers/${teacherSlug}`}
        className="block"
      >
        <Card className="hover:shadow-md transition-shadow h-full">
          <CardHeader>
            <div className="flex items-start space-x-3">
              <Avatar className="h-12 w-12 flex-shrink-0">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback>{getInitials(user)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">{fullName}</CardTitle>
                {/* Roles as badges underneath name */}
                {schoolRoles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {schoolRoles.map((role, index) => (
                      <Badge key={index} variant="secondary">
                        {role.roleName || role.roleKey || "Unknown"}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Email as clickable link */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `mailto:${user.email}`;
              }}
              className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
            >
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{user.email}</span>
            </button>
          </CardContent>
        </Card>
      </Link>
    );
  };

  // Render category section component
  const renderCategorySection = (
    title: string,
    users: UserWithRolesAndSchools[]
  ) => {
    if (users.length === 0) return null;

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <div key={user.id} className="h-full">
              {renderTeacherCard(user)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Teacher card skeleton component
  const TeacherCardSkeleton = () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start space-x-3">
          <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-5 w-32" />
            <div className="flex flex-wrap gap-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-4 flex-shrink-0" />
          <Skeleton className="h-4 w-40" />
        </div>
      </CardContent>
    </Card>
  );

  if (!currentSchool) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">School not found</h1>
          <p className="text-muted-foreground">
            The school you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Users className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Teachers</h1>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teachers by name, email, or role..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading}
          />
        </div>
        <Select
          value={selectedRole}
          onValueChange={setSelectedRole}
          disabled={loading}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {categorizedRoles.administrative.length > 0 && (
              <SelectGroup>
                <SelectLabel>Administrative</SelectLabel>
                {categorizedRoles.administrative.map((role) => (
                  <SelectItem key={role.roleKey} value={role.roleKey}>
                    {role.roleName}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {categorizedRoles.teaching.length > 0 && (
              <SelectGroup>
                <SelectLabel>Teaching</SelectLabel>
                {categorizedRoles.teaching.map((role) => (
                  <SelectItem key={role.roleKey} value={role.roleKey}>
                    {role.roleName}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {categorizedRoles.staff.length > 0 && (
              <SelectGroup>
                <SelectLabel>Staff</SelectLabel>
                {categorizedRoles.staff.map((role) => (
                  <SelectItem key={role.roleKey} value={role.roleKey}>
                    {role.roleName}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {categorizedRoles.other.length > 0 && (
              <SelectGroup>
                <SelectLabel>Other</SelectLabel>
                {categorizedRoles.other.map((role) => (
                  <SelectItem key={role.roleKey} value={role.roleKey}>
                    {role.roleName}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Teachers Grid by Category */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <TeacherCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No teachers found matching your search."
                  : "No teachers found for this school."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Array.from(usersByRole.entries())
            .sort(([roleA], [roleB]) => roleA.localeCompare(roleB))
            .map(([roleName, users]) => (
              <Fragment key={roleName}>
                {renderCategorySection(roleName, users)}
              </Fragment>
            ))}
        </div>
      )}
    </div>
  );
}
