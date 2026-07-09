"use client";

import { useState, useMemo, useEffect } from "react";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { SchoolPageCompactHeader } from "@/components/molecules/school-page-compact-header";
import { useStorageImageUrl } from "@/hooks/use-storage-image-url";
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
import { GraduationCap, Loader2, Search, Star } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { toast } from "sonner";

type ClassItem = {
  id: string;
  name: string | null;
  stream?: string | null;
  yearNames?: string[] | null;
  room?: string | null;
  studentCap?: number | null;
};

function ClassCard({
  classItem,
  isStarred,
  isToggling,
  onToggle,
  disabled,
}: {
  classItem: ClassItem;
  isStarred: boolean;
  isToggling: boolean;
  onToggle: (classId: string, isStarred: boolean) => void;
  disabled: boolean;
}) {
  const handleClick = () => {
    if (!disabled && !isToggling) {
      onToggle(classItem.id, isStarred);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      type="button"
      className="w-full h-full text-left block"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled || isToggling}
      aria-disabled={disabled || isToggling}
      aria-label={`${isStarred ? "Remove" : "Add"} ${classItem.name ?? "class"} from my classes`}
    >
      <Card
        className={cn(
          "group h-full transition-all duration-200",
          "hover:shadow-md",
          (disabled || isToggling) && "pointer-events-none opacity-60 cursor-not-allowed",
          !(disabled || isToggling) && "cursor-pointer",
          // Base and selected state
          isStarred && "bg-[var(--brand-bullyproof-primary)]/5",
          // Unstarred hover
          !isStarred &&
            !disabled &&
            !isToggling &&
            "hover:scale-[1.01] hover:-translate-y-1 hover:bg-[var(--brand-bullyproof-primary)]/5",
          // Starred hover (inverse)
          isStarred &&
            !disabled &&
            !isToggling &&
            "hover:scale-[0.99] hover:translate-y-1 hover:bg-card"
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
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={cn(
                  "text-sm text-muted-foreground whitespace-nowrap transition-all capitalize",
                  (disabled || isToggling)
                    ? "opacity-0"
                    : "opacity-0 group-hover:animate-slide-right-fade-in"
                )}
              >
                {isStarred ? (
                  <>remove from <span className="font-semibold">my classes</span></>
                ) : (
                  <>add to <span className="font-semibold">my classes</span></>
                )}
              </span>
              {isToggling ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <Star
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                    isStarred
                      ? "fill-amber-500 text-amber-500"
                      : "text-muted-foreground",
                    !disabled &&
                      isStarred &&
                      "group-hover:animate-spin-slow-reverse group-hover:fill-transparent group-hover:text-muted-foreground",
                    !disabled &&
                      !isStarred &&
                      "group-hover:animate-spin-slow group-hover:fill-amber-500 group-hover:text-amber-500"
                  )}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {classItem.yearNames && classItem.yearNames.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {classItem.yearNames.map((yearName, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {yearName}
                  </Badge>
                ))}
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
                <span className="text-muted-foreground">Capacity: </span>
                <span className="font-medium">{classItem.studentCap}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

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

export default function ClassesPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  usePageTitle(["schools", "classes"]);
  const currentSchool = useSchoolStore((state) => state.currentSchool);
  const currentUser = useMeStore((state) => state.currentUser);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [schoolSlug, setSchoolSlug] = useState<string>("");
  const [showContentAnimation, setShowContentAnimation] = useState(false);
  const [filter, setFilter] = useState<"all" | "my-classes" | "other-classes">(
    "all"
  );

  useEffect(() => {
    params.then(({ school_id }) => setSchoolSlug(school_id));
  }, [params]);

  const banner = useStorageImageUrl(currentSchool?.bannerUrl ?? null);
  const avatar = useStorageImageUrl(currentSchool?.avatarUrl ?? null);
  const headerReady =
    !(!!currentSchool?.bannerUrl && banner.loading) &&
    !(!!currentSchool?.avatarUrl && avatar.loading);

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
    onSuccess: (_, variables) => {
      const className =
        classes.find((c) => c.id === variables.classId)?.name ?? "Class";
      toast.success(
        variables.isStarred
          ? `${className} successfully removed from my classes`
          : `${className} successfully added to my classes`
      );
      queryClient.invalidateQueries({
        queryKey: ["user-classes", currentUser?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["teacher-classes", currentUser?.id],
      });
    },
  });

  // Separate classes into categories
  const { myClasses, otherClasses } = useMemo(() => {
    const myClassesList = classes.filter((classItem) =>
      userClassIds.has(classItem.id)
    );
    const otherClassesList = classes.filter(
      (classItem) => !userClassIds.has(classItem.id)
    );

    // Sort each category alphabetically by name
    myClassesList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    otherClassesList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    return { myClasses: myClassesList, otherClasses: otherClassesList };
  }, [classes, userClassIds]);

  // Filter classes based on search query and filter dropdown
  const filteredClasses = useMemo(() => {
    let classesToFilter = [];

    // Apply filter dropdown
    if (filter === "my-classes") {
      classesToFilter = myClasses;
    } else if (filter === "other-classes") {
      classesToFilter = otherClasses;
    } else {
      classesToFilter = classes;
    }

    // Apply search query
    if (!searchQuery.trim()) return classesToFilter;

    return classesToFilter.filter((classItem) => {
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
  }, [classes, myClasses, otherClasses, filter, searchQuery]);

  // Separate filtered classes back into categories for display
  const { filteredMyClasses, filteredOtherClasses } = useMemo(() => {
    const myClassesList = filteredClasses.filter((classItem) =>
      userClassIds.has(classItem.id)
    );
    const otherClassesList = filteredClasses.filter(
      (classItem) => !userClassIds.has(classItem.id)
    );

    // Sort each category alphabetically by name
    myClassesList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    otherClassesList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    return {
      filteredMyClasses: myClassesList,
      filteredOtherClasses: otherClassesList,
    };
  }, [filteredClasses, userClassIds]);

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

  if (!schoolSlug) {
    return (
      <>
        <FeatureGuard feature="/school/classes" />
        {null}
      </>
    );
  }

  if (!currentSchool) {
    return (
      <>
        <FeatureGuard feature="/school/classes" schoolId={undefined} />
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">School not found</h1>
            <p className="text-muted-foreground">
              The school you&apos;re looking for doesn&apos;t exist.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <FeatureGuard feature="/school/classes" schoolId={currentSchool.id} />
      <div className="space-y-6">
        <SchoolPageCompactHeader
          bannerUrl={banner.url}
          avatarUrl={avatar.url}
          title="Classes"
          description="Browse and manage classes, and add them to your list."
          isLoading={!headerReady}
          onAnimationComplete={() => setShowContentAnimation(true)}
        />

        <div
          className={`space-y-6 opacity-0 ${showContentAnimation ? "animate-slide-down-fade-in" : ""}`}
          style={
            showContentAnimation
              ? { animationFillMode: "forwards" }
              : undefined
          }
        >
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search classes by name, code, stream, or year level..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading}
          />
        </div>
        <Select
          value={filter}
          onValueChange={(value: "all" | "my-classes" | "other-classes") =>
            setFilter(value)
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            <SelectItem value="my-classes">My Classes</SelectItem>
            <SelectItem value="other-classes">Other Classes</SelectItem>
          </SelectContent>
        </Select>
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
      ) : (
        <div className="space-y-8">
          {/* My Classes Section */}
          {filter !== "other-classes" && filteredMyClasses.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center">
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg pl-2 font-medium text-muted-foreground">My Classes</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredMyClasses.map((classItem) => (
                  <ClassCard
                    key={classItem.id}
                    classItem={classItem}
                    isStarred={userClassIds.has(classItem.id)}
                    isToggling={toggleClassMutation.isPending}
                    onToggle={(classId, isStarred) =>
                      toggleClassMutation.mutate({ classId, isStarred })
                    }
                    disabled={!currentUser?.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Classes Section (or "All Classes" if user has no My Classes) */}
          {filter !== "my-classes" && filteredOtherClasses.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg pl-2 font-medium text-muted-foreground">
                {myClasses.length > 0 ? "Other Classes" : "All Classes"}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredOtherClasses.map((classItem) => (
                  <ClassCard
                    key={classItem.id}
                    classItem={classItem}
                    isStarred={userClassIds.has(classItem.id)}
                    isToggling={toggleClassMutation.isPending}
                    onToggle={(classId, isStarred) =>
                      toggleClassMutation.mutate({ classId, isStarred })
                    }
                    disabled={!currentUser?.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredClasses.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "No classes found matching your search."
                      : filter === "my-classes"
                        ? "You haven't added any classes to your list yet."
                        : filter === "other-classes"
                          ? "No other classes found."
                          : "No classes found for this school."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
        </div>
    </div>
    </>
  );
}
