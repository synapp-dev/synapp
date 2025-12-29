"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Mail, Search, Users } from "lucide-react";
import { meApi, type UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
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

  useEffect(() => {
    async function fetchUsers() {
      // Use slug from store (API will resolve it to ID)
      const schoolIdentifier = currentSchool?.slug || currentSchool?.id;
      
      if (!schoolIdentifier) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await meApi.get.listAllUsers({
          schoolId: schoolIdentifier, // Can be UUID or slug - API will handle it
          limit: 100, // Max allowed by API
        });

        if (!result.error && result.data) {
          setUsers(result.data);
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
  }, [currentSchool?.slug, currentSchool?.id]);

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
        (role) =>
          role.roleKey === "TEACHER" || role.roleKey === "SCHOOL_ADMIN"
      );
    });
  }, [users, currentSchool?.id]);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return usersWithValidRoles;

    return usersWithValidRoles.filter((user) => {
      const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      const email = user.email || "";
      
      return (
        fuzzySearch(searchQuery, fullName) ||
        fuzzySearch(searchQuery, email) ||
        user.schoolRoles.some((role) =>
          fuzzySearch(searchQuery, role.roleName || "")
        )
      );
    });
  }, [usersWithValidRoles, searchQuery]);

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
      (role) =>
        role.schoolId === schoolId &&
        role.roleKey !== "SCHOOL_LICENCE"
    );
  };

  // Convert teacher name to URL-friendly slug
  const getTeacherSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, "-");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Users className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Teachers</h1>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading teachers...</p>
        </div>
      </div>
    );
  }

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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search teachers by name, email, or role..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Teachers Grid */}
      {filteredUsers.length === 0 ? (
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => {
            const fullName = getFullName(user);
            const schoolRoles = getSchoolRoles(user);
            const teacherSlug = getTeacherSlug(fullName);
            const schoolSlug = currentSchool?.slug || "";

            return (
              <Link
                key={user.id}
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
                        <CardTitle className="text-lg truncate">
                          {fullName}
                        </CardTitle>
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
          })}
        </div>
      )}
    </div>
  );
}

