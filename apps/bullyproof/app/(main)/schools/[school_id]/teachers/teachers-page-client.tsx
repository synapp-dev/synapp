"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/card";
import { RoleBadges } from "@/components/atoms/role-badges";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Search } from "lucide-react";
import {
  meApi,
  type UserWithRolesAndSchools,
} from "@/entities/me/api/endpoints";
import { useSchoolStore } from "@/stores/school-store";
import Link from "next/link";
import Image from "next/image";
import { useStorageImageUrl } from "@/hooks/use-storage-image-url";

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

/** Single display bucket per person: admins, then teachers/AP, then staff, then other school roles. */
function teachersPageSortBucket(
  user: UserWithRolesAndSchools,
  schoolId: string
): number {
  const keys = user.schoolRoles
    .filter(
      (role) =>
        role.schoolId === schoolId && role.roleKey && role.roleKey !== "SCHOOL_LICENCE"
    )
    .map((role) => role.roleKey as string);
  if (keys.includes("SCHOOL_ADMIN")) return 1;
  if (keys.some((k) => k === "TEACHER" || k.includes("TEACHER"))) return 2;
  if (keys.includes("SCHOOL_STAFF")) return 3;
  return 4;
}

function teachersPageDisplayName(user: UserWithRolesAndSchools): string {
  const full = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return full || user.email || "";
}

export default function TeachersPageClient() {
  const USERS_BATCH_SIZE = 100;
  const currentSchool = useSchoolStore((state) => state.currentSchool);
  const [users, setUsers] = useState<UserWithRolesAndSchools[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const isCancelledRef = useRef(false);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const schoolAvatar = useStorageImageUrl(currentSchool?.avatarUrl ?? null);

  const fetchUsersBatch = useCallback(
    async (offset: number, append: boolean) => {
      const schoolId = currentSchool?.id;
      if (!schoolId || isCancelledRef.current) return;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsInitialLoading(true);
      }

      try {
        const result = await meApi.get.listAllUsers({
          schoolId,
          limit: USERS_BATCH_SIZE,
          offset,
        });

        if (isCancelledRef.current || result.error || !result.data) {
          if (result.error) {
            console.error("Failed to fetch users:", result.error);
          }
          return;
        }

        const { users: batchUsers, totalCount } = result.data;
        let usersToMerge = batchUsers;

        // Ensure school admins are visible from first paint, regardless of
        // alphabetical pagination order in the general users list.
        if (!append) {
          const adminResult = await meApi.get.listAllUsers({
            schoolId,
            role: "SCHOOL_ADMIN",
            limit: USERS_BATCH_SIZE,
            offset: 0,
          });
          if (!adminResult.error && adminResult.data) {
            usersToMerge = [...adminResult.data.users, ...batchUsers];
          }
        }

        const updatedOffset = offset + batchUsers.length;

        setTotalUsers(totalCount);
        setNextOffset(updatedOffset);
        setHasMoreUsers(batchUsers.length > 0 && updatedOffset < totalCount);
        setUsers((previousUsers) => {
          if (!append) {
            const usersById = new Map(
              usersToMerge.map((user) => [user.id, user])
            );
            return Array.from(usersById.values());
          }
          const usersById = new Map(previousUsers.map((user) => [user.id, user]));
          usersToMerge.forEach((user) => {
            usersById.set(user.id, user);
          });
          return Array.from(usersById.values());
        });
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        if (!isCancelledRef.current) {
          if (append) {
            setIsLoadingMore(false);
          } else {
            setIsInitialLoading(false);
          }
        }
      }
    },
    [currentSchool?.id]
  );

  const fetchNextBatch = useCallback(() => {
    if (isInitialLoading || isLoadingMore || !hasMoreUsers) return;
    void fetchUsersBatch(nextOffset, true);
  }, [fetchUsersBatch, hasMoreUsers, isInitialLoading, isLoadingMore, nextOffset]);

  useEffect(() => {
    isCancelledRef.current = false;
    const schoolId = currentSchool?.id;

    if (!schoolId) {
      setUsers([]);
      setTotalUsers(null);
      setNextOffset(0);
      setHasMoreUsers(false);
      setIsInitialLoading(false);
      setIsLoadingMore(false);
      return () => {
        isCancelledRef.current = true;
      };
    }

    setUsers([]);
    setTotalUsers(null);
    setNextOffset(0);
    setHasMoreUsers(false);
    setIsLoadingMore(false);

    void fetchUsersBatch(0, false);

    return () => {
      isCancelledRef.current = true;
    };
  }, [currentSchool?.id, fetchUsersBatch]);

  useEffect(() => {
    if (isInitialLoading || isLoadingMore || !hasMoreUsers) return;
    const trigger = loadMoreTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);
        if (isVisible) {
          fetchNextBatch();
        }
      },
      { rootMargin: "300px 0px" }
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [fetchNextBatch, hasMoreUsers, isInitialLoading, isLoadingMore]);

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

  // Flat role list for filter (same priority as the main list: admin, teacher, staff, other)
  const roleFilterOptions = useMemo(() => {
    const schoolId = currentSchool?.id;
    if (!schoolId) return [];

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

    const bucket = (roleKey: string) => {
      if (roleKey === "SCHOOL_ADMIN") return 1;
      if (roleKey === "TEACHER" || roleKey.includes("TEACHER")) return 2;
      if (roleKey === "SCHOOL_STAFF") return 3;
      return 4;
    };

    return Array.from(roleMap.values()).sort((a, b) => {
      const ba = bucket(a.roleKey);
      const bb = bucket(b.roleKey);
      if (ba !== bb) return ba - bb;
      return a.roleName.localeCompare(b.roleName);
    });
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

  const sortedDisplayUsers = useMemo(() => {
    const schoolId = currentSchool?.id;
    if (!schoolId) return [];
    return [...filteredUsers].sort((a, b) => {
      const ra = teachersPageSortBucket(a, schoolId);
      const rb = teachersPageSortBucket(b, schoolId);
      if (ra !== rb) return ra - rb;
      return teachersPageDisplayName(a).localeCompare(teachersPageDisplayName(b));
    });
  }, [filteredUsers, currentSchool?.id]);

  const positionsByUserId = useMemo(() => {
    const schoolId = currentSchool?.id;
    if (!schoolId) return new Map<string, string[]>();

    const map = new Map<string, string[]>();
    usersWithValidRoles.forEach((user) => {
      const positions = (user.schoolPositions ?? [])
        .filter((position) => position.schoolId === schoolId)
        .map((position) => position.position.trim())
        .filter((position) => position.length > 0);
      map.set(user.id, positions);
    });
    return map;
  }, [currentSchool?.id, usersWithValidRoles]);

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

  // One card per person: all school roles shown together
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
            disabled={isInitialLoading}
          />
        </div>
        <Select
          value={selectedRole}
          onValueChange={setSelectedRole}
          disabled={isInitialLoading}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roleFilterOptions.map((role) => (
              <SelectItem key={role.roleKey} value={role.roleKey}>
                {role.roleName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isInitialLoading && isLoadingMore && (
        <p className="text-sm text-muted-foreground">
          Loading more teachers
          {totalUsers != null ? ` (${users.length}/${totalUsers})` : ""}...
        </p>
      )}

      {/* Teachers grid (one row per person; admins, then teachers, then staff) */}
      {isInitialLoading ? (
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
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedDisplayUsers.map((user) => (
            <div key={user.id} className="h-full">
              {renderTeacherCardSearchResult(user)}
            </div>
          ))}
        </div>
      )}

      {hasMoreUsers && (
        <div ref={loadMoreTriggerRef} className="h-1 w-full" aria-hidden />
      )}
    </div>
  );
}
