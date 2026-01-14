"use client";

import { useState, useMemo } from "react";
import { useSchoolStore } from "@/stores/school-store";
import { useClasses } from "@/entities/classes/model/store";
import { useMeStore } from "@/entities/me/model/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { meApi } from "@/entities/me/api/endpoints";
import { apiFetch } from "@/lib/api/fetcher.client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { GraduationCap, Plus, Loader2, Search, Star } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

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

type UserClass = {
  classId: string;
  className: string;
  classCode: string | null;
  schoolId: string;
  schoolName: string | null;
  active: boolean;
  createdAt: string;
};

export default function ClassesPage() {
  usePageTitle(["schools", "classes"]);
  const currentSchool = useSchoolStore((state) => state.currentSchool);
  const currentUser = useMeStore((state) => state.currentUser);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Use React Query hook for classes
  const {
    classes,
    isLoading: loading,
    isError,
    error: queryError,
  } = useClasses({
    schoolId: currentSchool?.id,
  });

  const error = isError
    ? queryError instanceof Error
      ? queryError.message
      : "Failed to load classes"
    : null;

  // Fetch current user's classes to determine star state
  const { data: userClassesData } = useQuery<UserClass[]>({
    queryKey: ["user-classes", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const result = await apiFetch<UserClass[]>(
        `/users/${currentUser.id}/classes`
      );
      if (result.error) {
        console.error("Failed to fetch user classes:", result.error);
        return [];
      }
      return result.data || [];
    },
    enabled: !!currentUser?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const userClassIds = useMemo(() => {
    return new Set(userClassesData?.map((uc) => uc.classId) || []);
  }, [userClassesData]);

  // Mutation to toggle class star
  const toggleClassMutation = useMutation({
    mutationFn: async ({
      classId,
      isStarred,
    }: {
      classId: string;
      isStarred: boolean;
    }) => {
      const result = await meApi.teacherClasses.toggle(
        classId,
        isStarred ? "remove" : "add"
      );
      if (result.error) {
        throw new Error(result.error.message || "Failed to toggle class");
      }
      return result.data;
    },
    onSuccess: () => {
      // Invalidate user classes query to refresh star states
      queryClient.invalidateQueries({
        queryKey: ["user-classes", currentUser?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["teacher-classes", currentUser?.id],
      });
    },
  });

  // Filter classes based on search query and sort starred classes first
  const filteredClasses = useMemo(() => {
    let filtered = classes;

    // Filter by search query if provided
    if (searchQuery.trim()) {
      filtered = classes.filter((classItem) => {
        const name = classItem.name || "";
        const code = classItem.code || "";
        const stream = classItem.stream || "";
        const yearCodes = classItem.yearCodes?.join(" ") || "";

        return (
          fuzzySearch(searchQuery, name) ||
          fuzzySearch(searchQuery, code) ||
          fuzzySearch(searchQuery, stream) ||
          fuzzySearch(searchQuery, yearCodes)
        );
      });
    }

    // Sort: starred classes first, then by name
    return filtered.sort((a, b) => {
      const aStarred = userClassIds.has(a.id);
      const bStarred = userClassIds.has(b.id);

      // If one is starred and the other isn't, starred comes first
      if (aStarred && !bStarred) return -1;
      if (!aStarred && bStarred) return 1;

      // Otherwise, sort alphabetically by name
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [classes, searchQuery, userClassIds]);

  // Class card skeleton component
  const ClassCardSkeleton = () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full shrink-0" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <div className="flex flex-wrap gap-1">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
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
        <GraduationCap className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Classes</h1>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search classes by name, code, stream, or year level..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Classes Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <ClassCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-destructive">Error loading classes: {error}</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredClasses.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No classes found matching your search."
                  : "No classes found for this school."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((classItem) => {
            const isStarred = userClassIds.has(classItem.id);
            const isToggling = toggleClassMutation.isPending;

            return (
              <Card
                key={classItem.id}
                className={cn(
                  "hover:shadow-md transition-shadow h-full",
                  isStarred && "bg-[var(--brand-bullyproof-primary)]/5"
                )}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {classItem.name}
                      </CardTitle>
                      {classItem.stream && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Stream: {classItem.stream}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isToggling && currentUser?.id) {
                          toggleClassMutation.mutate({
                            classId: classItem.id,
                            isStarred,
                          });
                        }
                      }}
                      disabled={isToggling || !currentUser?.id}
                      className={cn(
                        "shrink-0 p-1 rounded-md transition-colors",
                        "hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed",
                        isStarred && "text-amber-500"
                      )}
                      title={
                        isStarred
                          ? "Remove from my classes"
                          : "Add to my classes"
                      }
                    >
                      <Star
                        className={cn(
                          "h-5 w-5",
                          isStarred
                            ? "fill-amber-500 text-amber-500"
                            : "text-muted-foreground"
                        )}
                      />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {classItem.code && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Code: </span>
                        <span className="font-medium">{classItem.code}</span>
                      </div>
                    )}
                    {classItem.yearCodes && classItem.yearCodes.length > 0 && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">
                          Year Levels:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {classItem.yearCodes.map((yearCode, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs"
                            >
                              {yearCode}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {classItem.room && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Room: </span>
                        <span className="font-medium">{classItem.room}</span>
                      </div>
                    )}
                    {classItem.studentCap && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          Capacity:{" "}
                        </span>
                        <span className="font-medium">
                          {classItem.studentCap}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
