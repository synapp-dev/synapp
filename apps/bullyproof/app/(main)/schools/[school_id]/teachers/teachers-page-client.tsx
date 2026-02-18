"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { RoleBadges } from "@/components/atoms/role-badges";
import { Button } from "@workspace/ui/components/button";
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
import {
  Search,
  Shield,
  GraduationCap,
  Users,
  Tag,
} from "lucide-react";
import {
  meApi,
  type UserWithRolesAndSchools,
} from "@/entities/me/api/endpoints";
import { useSchoolStore } from "@/stores/school-store";
import Link from "next/link";
import Image from "next/image";
import { useStorageImageUrl } from "@/hooks/use-storage-image-url";
import { getUserPositionsOptions } from "@/entities/users/api/user-details-queries";

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
  const schoolAvatar = useStorageImageUrl(currentSchool?.avatarUrl ?? null);

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

  // Filter users to only show those with TEACHER, SCHOOL_ADMIN, or SCHOOL_STAFF (exclude SCHOOL_LICENCE only users)
  const usersWithValidRoles = useMemo(() => {
    const schoolId = currentSchool?.id;
    if (!schoolId) return users;

    return users.filter((user) => {
      const schoolRoles = user.schoolRoles.filter(
        (role) => role.schoolId === schoolId && role.roleKey !== "SCHOOL_LICENCE"
      );
      return schoolRoles.length > 0;
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

  const isSearchMode = searchQuery.trim().length > 0;

  // Filter users based on search query and role filter
  const filteredUsers = useMemo(() => {
    let filtered = usersWithValidRoles;

    // When searching: filter by search only (no role filter)
    if (isSearchMode) {
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
      return filtered;
    }

    // When role filter selected: filter to that role only
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

    return filtered;
  }, [usersWithValidRoles, searchQuery, selectedRole, currentSchool?.id, isSearchMode]);

  // Group filtered users by roles (only when not in search mode)
  // When role filter: single category, each user once
  // When "all": multiple categories, users can appear in each category they have
  const usersByRole = useMemo(() => {
    const schoolId = currentSchool?.id;
    if (!schoolId) return new Map<string, { roleKey: string; roleName: string; users: UserWithRolesAndSchools[] }>();

    const roleMap = new Map<string, { roleKey: string; roleName: string; users: UserWithRolesAndSchools[] }>();

    filteredUsers.forEach((user) => {
      const schoolRoles = user.schoolRoles.filter(
        (role) =>
          role.schoolId === schoolId && role.roleKey !== "SCHOOL_LICENCE"
      );

      // When role filter: add user only to the selected role's category (once)
      if (selectedRole !== "all") {
        const role = schoolRoles.find((r) => r.roleKey === selectedRole);
        if (!role) return;
        const roleKey = role.roleKey || "";
        const roleName = role.roleName || roleKey || "Unknown";
        if (!roleMap.has(roleName)) {
          roleMap.set(roleName, { roleKey, roleName, users: [] });
        }
        const entry = roleMap.get(roleName)!;
        if (!entry.users.some((u) => u.id === user.id)) {
          entry.users.push(user);
        }
        return;
      }

      // When "all": add user to each role category they have
      schoolRoles.forEach((role) => {
        const roleKey = role.roleKey || "";
        const roleName = role.roleName || roleKey || "Unknown";

        if (!roleMap.has(roleName)) {
          roleMap.set(roleName, { roleKey, roleName, users: [] });
        }

        const entry = roleMap.get(roleName)!;
        if (!entry.users.some((u) => u.id === user.id)) {
          entry.users.push(user);
        }
      });
    });

    return roleMap;
  }, [filteredUsers, currentSchool?.id, selectedRole]);

  const userPositionsQueries = useQueries({
    queries: usersWithValidRoles.map((user) =>
      getUserPositionsOptions(user.id)
    ),
  });

  const positionsByUserId = useMemo(() => {
    const schoolId = currentSchool?.id;
    if (!schoolId) return new Map<string, string[]>();

    const map = new Map<string, string[]>();
    usersWithValidRoles.forEach((user, index) => {
      const data = userPositionsQueries[index]?.data ?? [];
      const positions = data
        .filter((position) => position.schoolId === schoolId)
        .map((position) => position.position.trim())
        .filter((position) => position.length > 0);
      map.set(user.id, positions);
    });
    return map;
  }, [currentSchool?.id, userPositionsQueries, usersWithValidRoles]);

  // Section order: School Admins first, then Teaching (AP Teacher etc), then Staff
  const sectionOrder = (a: string, b: string) => {
    const order: Record<string, number> = {
      SCHOOL_ADMIN: 1,
      TEACHER: 2,
      SCHOOL_STAFF: 3,
    };
    const aKey = usersByRole.get(a)?.roleKey ?? "";
    const bKey = usersByRole.get(b)?.roleKey ?? "";
    const aPriority = order[aKey] ?? 4;
    const bPriority = order[bKey] ?? 4;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.localeCompare(b);
  };

  const getFullName = (user: UserWithRolesAndSchools) => {
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return `${firstName} ${lastName}`.trim() || user.email;
  };

  const getSchoolInitials = () => {
    const schoolName = currentSchool?.name?.trim() || "";
    if (!schoolName) return "S";
    const words = schoolName.split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0]![0]!.toUpperCase();
    return `${words[0]![0] ?? ""}${words[1]![0] ?? ""}`.toUpperCase();
  };

  // Convert teacher name to URL-friendly slug
  const getTeacherSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, "-");
  };

  const getSchoolRolesForUser = (user: UserWithRolesAndSchools) => {
    const schoolId = currentSchool?.id;
    if (!schoolId) return [];
    return user.schoolRoles.filter(
      (role) => role.schoolId === schoolId && role.roleKey !== "SCHOOL_LICENCE"
    );
  };

  // Render teacher card - shows only the role badge for this category
  const renderTeacherCard = (
    user: UserWithRolesAndSchools,
    sectionRole: { roleKey: string; roleName: string }
  ) => {
    return renderTeacherCardInner(user, [
      { roleKey: sectionRole.roleKey, roleName: sectionRole.roleName },
    ]);
  };

  // Render teacher card for search results - shows all roles joined
  const renderTeacherCardSearchResult = (user: UserWithRolesAndSchools) => {
    const schoolRoles = getSchoolRolesForUser(user);
    const roles = schoolRoles.map((r) => ({
      roleKey: r.roleKey || "",
      roleName: r.roleName || undefined,
    }));
    return renderTeacherCardInner(user, roles, "joined");
  };

  const renderTeacherCardInner = (
    user: UserWithRolesAndSchools,
    roles: { roleKey: string; roleName?: string }[],
    badgeVariant: "pill" | "joined" = "pill"
  ) => {
    const fullName = getFullName(user);
    const teacherSlug = getTeacherSlug(fullName);
    const schoolSlug = currentSchool?.slug || "";
    const firstName = user.firstName?.trim() || "";
    const lastName = user.lastName?.trim() || "";
    const positions = positionsByUserId.get(user.id) ?? [];

    return (
      <Link
        href={`/schools/${schoolSlug}/teachers/${teacherSlug}`}
        className="block group"
      >
        <Card className="h-full relative transform-gpu will-change-transform transition-all duration-300 ease-out hover:shadow-md hover:bg-[var(--brand-bullyproof-primary)] hover:scale-[1.01] hover:-translate-y-1">
          <CardHeader className="w-full h-full flex items-end justify-start">
            <RoleBadges
              roles={roles}
              variant={badgeVariant}
              size="sm"
              className="absolute top-4 right-4 shrink-0"
            />
            <div className="flex items-center gap-2">
              <div className="h-16 w-16 flex-shrink-0 flex items-center justify-center overflow-hidden">
                {schoolAvatar.url ? (
                  <Image
                    src={schoolAvatar.url}
                    alt={currentSchool?.name ?? "School"}
                    width={64}
                    height={64}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">
                    {getSchoolInitials()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 pb-0.5">
                {firstName || lastName ? (
                  <div className="flex items-baseline gap-1.5 min-w-0 origin-left transform-gpu transition-transform duration-300 ease-out group-hover:scale-[1.03]">
                    <span className="text-xl font-light text-foreground/90 truncate transition-colors duration-200 ease-in-out group-hover:text-secondary">
                      {firstName || "—"}
                    </span>
                    <span className="text-xl font-extrabold text-foreground truncate transition-colors duration-200 ease-in-out group-hover:text-secondary">
                      {lastName || "—"}
                    </span>
                  </div>
                ) : (
                  <div className="text-xl font-semibold truncate origin-left transform-gpu transition-[transform,color] duration-300 ease-out group-hover:scale-[1.03] group-hover:text-secondary">
                    {fullName || user.email}
                  </div>
                )}
                {positions.length > 0 ? (
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground capitalize transition-colors duration-200 ease-in-out group-hover:text-secondary/85">
                    {positions.map((position, index) => (
                      <span
                        key={`${user.id}-${position}-${index}`}
                        className="inline-flex items-center gap-x-1"
                      >
                        {index > 0 ? (
                          <span aria-hidden className="opacity-50">
                            •
                          </span>
                        ) : null}
                        <span>{position}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-1 h-3 w-24 opacity-0" aria-hidden />
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      </Link>
    );
  };

  const getCategoryIcon = (roleKey: string) => {
    if (roleKey === "SCHOOL_ADMIN") return Shield;
    if (roleKey === "TEACHER" || roleKey?.includes("TEACHER")) return GraduationCap;
    if (roleKey === "SCHOOL_STAFF") return Users;
    return Tag;
  };

  // Render category section component
  const renderCategorySection = (
    title: string,
    users: UserWithRolesAndSchools[],
    sectionRole: { roleKey: string; roleName: string }
  ) => {
    if (users.length === 0) return null;

    const CategoryIcon = getCategoryIcon(sectionRole.roleKey);

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-muted-foreground flex items-center gap-2">
          <CategoryIcon className="h-5 w-5" />
          {title}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {users.map((user) => (
            <div key={`${user.id}-${sectionRole.roleKey}`} className="h-full">
              {renderTeacherCard(user, sectionRole)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Teacher card skeleton component
  const TeacherCardSkeleton = () => (
    <Card className="h-full relative">
      <CardHeader className="w-full h-full flex items-end justify-start">
        <Skeleton className="h-6 w-20 rounded-full shrink-0 absolute top-4 right-4" />
        <div className="flex items-end gap-3">
          <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      </CardHeader>
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
        <div className="grid gap-4 md:grid-cols-2">
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
      ) : isSearchMode ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredUsers.map((user) => (
            <div key={user.id} className="h-full">
              {renderTeacherCardSearchResult(user)}
            </div>
          ))}
        </div>
      ) : (
        <div>
          {Array.from(usersByRole.entries())
            .sort(([roleA], [roleB]) => sectionOrder(roleA, roleB))
            .map(([roleName, entry], index) => (
              <Fragment key={roleName}>
                {index > 0 && <Separator className="my-12" />}
                {renderCategorySection(
                  roleName,
                  entry.users,
                  { roleKey: entry.roleKey, roleName: entry.roleName }
                )}
              </Fragment>
            ))}
        </div>
      )}
    </div>
  );
}
