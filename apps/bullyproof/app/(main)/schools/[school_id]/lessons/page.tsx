"use client";

import { useState, useEffect, useMemo } from "react";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { LessonWizard } from "@/components/organisms/lesson-wizard";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSchoolStore } from "@/stores/school-store";
import { useLessons } from "@/entities/lessons/model/store";
import { BookOpen, Eye, EyeOff, Plus, Search } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { format } from "date-fns";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { getDisplayStatus } from "@/utils/lesson-status";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useCurrentUser } from "@/entities/me/api/getCurrentUser";
import { LessonCard, type Lesson } from "@/entities/lessons/ui/lesson-card";

// Start New Lesson Card - matching LessonCard layout
function StartNewLessonCard({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="block w-full text-left cursor-pointer">
      <Card className="hover:shadow-md transition-shadow h-full overflow-visible p-0 gap-0 flex flex-col relative border-0 shadow-none bg-primary/5">
        {/* CardHeader - matching LessonCard */}
        <CardHeader className="py-3 px-4 bg-card/80 border border-b-0 rounded-t-lg flex flex-row justify-between items-center border-primary/30 border-dashed">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            New
          </span>
          <span className="text-xs text-muted-foreground">
            Create a lesson
          </span>
        </CardHeader>
        {/* CardContent - Thumbnail area with plus icon */}
        <CardContent className="p-0 bg-card/80 border-x border-primary/30 border-dashed rounded-lg relative z-[1]">
          <div className="w-full aspect-video bg-muted flex items-center justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Plus className="h-8 w-8 text-primary" />
            </div>
          </div>
        </CardContent>
        {/* CardFooter - matching LessonCard */}
        <CardFooter className="flex flex-col p-4 pt-3 gap-2 bg-card/80 border border-t-0 rounded-b-lg items-start border-primary/30 border-dashed">
          <p className="text-xs font-medium text-muted-foreground">
            Get started
          </p>
          <div className="flex items-center gap-2 min-w-0">
            <CardTitle className="text-base font-semibold text-primary capitalize line-clamp-2 flex-1 text-left">
              Start New Lesson
            </CardTitle>
          </div>
          {/* Placeholder to match LessonCard classes row */}
          <div className="flex flex-wrap gap-1 mt-1">
            <span className="text-xs py-0 px-1.5 h-5 border border-dashed border-muted-foreground/50 rounded-full inline-flex items-center text-muted-foreground">
              Select classes
            </span>
          </div>
        </CardFooter>
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

export default function LessonsPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const [schoolId, setSchoolId] = useState<string>("");

  useEffect(() => {
    params.then(({ school_id }) => setSchoolId(school_id));
  }, [params]);
  usePageTitle(["schools", "lessons"]);
  const currentSchool = useSchoolStore((state) => state.currentSchool);
  const [schoolSlug, setSchoolSlug] = useState<string>("");
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCompletedMyLessons, setShowCompletedMyLessons] = useState(false);
  const [showCompletedOtherLessons, setShowCompletedOtherLessons] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: currentUser } = useCurrentUser();

  // Get filter from URL query params, default to "my-lessons"
  const filterParam = searchParams?.get("filter");
  const filter: "all" | "my-lessons" = 
    filterParam === "all" ? "all" : "my-lessons";

  // Update URL when filter changes
  const setFilter = (newFilter: "all" | "my-lessons") => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (newFilter === "my-lessons") {
      params.delete("filter"); // Default, no need to show in URL
    } else {
      params.set("filter", newFilter);
    }
    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
  };

  useEffect(() => {
    params.then(({ school_id }) => {
      setSchoolSlug(school_id);
      setSchoolId(school_id);
    });
  }, [params]);

  // Check for dialog query parameter and open wizard if present
  useEffect(() => {
    const dialog = searchParams?.get("dialog");
    const startingYourLesson = searchParams?.get("startingYourLesson");
    if (
      (dialog === "add-new-lesson" || startingYourLesson === "true") &&
      currentSchool?.id
    ) {
      setIsWizardOpen(true);
    }
  }, [searchParams, currentSchool?.id]);

  // Use React Query hook for lessons - fetch "my lessons" separately when filter is "my-lessons"
  // When filter is "my-lessons", don't pass schoolId so API automatically filters by user token
  const {
    lessons,
    isLoading: loading,
    isError,
    error: queryError,
  } = useLessons({
    schoolId: filter === "my-lessons" ? undefined : currentSchool?.id,
    limit: 100,
  });

  const error = isError
    ? queryError instanceof Error
      ? queryError.message
      : "Failed to load lessons"
    : null;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "feedback":
        return "secondary";
      case "in_progress":
        return "secondary";
      case "scheduled":
        return "outline";
      case "draft":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatStatus = (status: string) => {
    return status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatCreatedDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d");
  };

  const getTeacherName = (lesson: Lesson) => {
    if (lesson.teacher) {
      const firstName = lesson.teacher.firstName || "";
      const lastName = lesson.teacher.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || lesson.teacher.email || "Unknown Teacher";
    }
    return "Unknown Teacher";
  };

  // Separate lessons into categories
  // When filter is "my-lessons", lessons already contains only user's lessons (from API)
  // When filter is "all", we need to separate them into my lessons and other lessons
  const { myLessons, otherLessons } = useMemo(() => {
    if (filter === "my-lessons") {
      // API already filtered by user, so all lessons are "my lessons"
      return { myLessons: lessons, otherLessons: [] };
    }

    const myLessonsList: Lesson[] = [];
    const otherLessonsList: Lesson[] = [];

    lessons.forEach((lesson) => {
      if (currentUser?.id && lesson.createdByUserId === currentUser.id) {
        myLessonsList.push(lesson);
      } else {
        otherLessonsList.push(lesson);
      }
    });

    return { myLessons: myLessonsList, otherLessons: otherLessonsList };
  }, [lessons, currentUser?.id, filter]);

  // Filter lessons based on search query and filter dropdown
  const filteredLessons = useMemo(() => {
    let lessonsToFilter: Lesson[] = [];

    // Apply filter dropdown
    if (filter === "my-lessons") {
      lessonsToFilter = myLessons;
    } else {
      // "all" - show all lessons
      lessonsToFilter = lessons;
    }

    // Apply search query
    if (!searchQuery.trim()) return lessonsToFilter;

    return lessonsToFilter.filter((lesson) => {
      const topicTitle = lesson.topic?.title || "";
      const teacherName = getTeacherName(lesson);
      const status = getDisplayStatus(lesson.status || "", lesson.scheduledFor);
      const classNames =
        lesson.assignedClasses?.map((c) => c.className).join(" ") || "";

      return (
        fuzzySearch(searchQuery, topicTitle) ||
        fuzzySearch(searchQuery, teacherName) ||
        fuzzySearch(searchQuery, status) ||
        fuzzySearch(searchQuery, classNames)
      );
    });
  }, [lessons, myLessons, otherLessons, filter, searchQuery]);

  // Separate filtered lessons back into categories for display
  const { filteredMyLessons, filteredOtherLessons } = useMemo(() => {
    const myLessonsList: Lesson[] = [];
    const otherLessonsList: Lesson[] = [];

    filteredLessons.forEach((lesson) => {
      if (currentUser?.id && lesson.createdByUserId === currentUser.id) {
        myLessonsList.push(lesson);
      } else {
        otherLessonsList.push(lesson);
      }
    });

    return {
      filteredMyLessons: myLessonsList,
      filteredOtherLessons: otherLessonsList,
    };
  }, [filteredLessons, currentUser?.id]);

  // Filter out completed lessons from My Lessons unless showCompletedMyLessons is true
  const displayedMyLessons = useMemo(() => {
    if (showCompletedMyLessons) return filteredMyLessons;
    return filteredMyLessons.filter((lesson) => {
      const displayStatus = getDisplayStatus(lesson.status || "", lesson.scheduledFor);
      return displayStatus !== "completed";
    });
  }, [filteredMyLessons, showCompletedMyLessons]);

  // Filter out completed lessons from Other Lessons unless showCompletedOtherLessons is true
  const displayedOtherLessons = useMemo(() => {
    if (showCompletedOtherLessons) return filteredOtherLessons;
    return filteredOtherLessons.filter((lesson) => {
      const displayStatus = getDisplayStatus(lesson.status || "", lesson.scheduledFor);
      return displayStatus !== "completed";
    });
  }, [filteredOtherLessons, showCompletedOtherLessons]);

  // Lesson card skeleton component (matching new vertical layout)
  const LessonCardSkeleton = () => (
    <Card className="h-full overflow-hidden p-0 gap-0 flex flex-col">
      <Skeleton className="w-full aspect-video rounded-t-md" />
      <div className="flex flex-col p-4 gap-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-32 flex-1" />
          <Skeleton className="h-5 w-20 rounded-full shrink-0" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-32" />
          <div className="flex flex-wrap gap-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>
    </Card>
  );

  if (!currentSchool) {
    return (
      <>
        <FeatureGuard feature="lessons" schoolId={currentSchool?.id} />
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">School not found</h1>
            <p className="text-muted-foreground">
              The school you're looking for doesn't exist.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <FeatureGuard feature="lessons" schoolId={currentSchool.id} />
      <div className="space-y-6">
        {/* Header */}
        {/* <div className="flex items-center gap-2">
          <BookOpen className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Lessons</h1>
        </div> */}

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search lessons by topic, teacher, status, or class..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loading}
            />
          </div>
          <Select
            value={filter}
            onValueChange={(value: "all" | "my-lessons") =>
              setFilter(value)
            }
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter lessons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="my-lessons">My Lessons</SelectItem>
              <SelectItem value="all">All Lessons</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lessons Grid */}
        {loading ? (
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">My Lessons</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Start New Lesson Card - Always First */}
                <StartNewLessonCard onClick={() => setIsWizardOpen(true)} />
                {[...Array(5)].map((_, i) => (
                  <LessonCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">My Lessons</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Start New Lesson Card - Always First */}
                <StartNewLessonCard onClick={() => setIsWizardOpen(true)} />
              </div>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-destructive">
                    Error loading lessons: {error}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-8">
            {/* My Lessons Section */}
            {/* My Lessons Section - always shown */}
            {(
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-semibold">My Lessons</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCompletedMyLessons(!showCompletedMyLessons)}
                    className="text-muted-foreground"
                  >
                    {showCompletedMyLessons ? (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Hide completed
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        Show completed
                      </>
                    )}
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* Start New Lesson Card - Always First */}
                  <StartNewLessonCard onClick={() => setIsWizardOpen(true)} />
                  {displayedMyLessons.map((lesson) => (
                    <LessonCard 
                      key={lesson.id} 
                      lesson={lesson} 
                      schoolSlug={schoolSlug}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Separator between sections */}
            {filter === "all" && filteredOtherLessons.length > 0 && (
              <Separator />
            )}

            {/* Other Lessons Section */}
            {filter === "all" && filteredOtherLessons.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-semibold">Other Lessons</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCompletedOtherLessons(!showCompletedOtherLessons)}
                    className="text-muted-foreground"
                  >
                    {showCompletedOtherLessons ? (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Hide completed
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        Show completed
                      </>
                    )}
                  </Button>
                </div>
                {displayedOtherLessons.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {displayedOtherLessons.map((lesson) => (
                      <LessonCard 
                        key={lesson.id} 
                        lesson={lesson} 
                        schoolSlug={schoolSlug}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    All other lessons are completed. Click "Show completed" to see them.
                  </p>
                )}
              </div>
            )}

            {/* Empty State */}
            {filteredLessons.length === 0 && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="col-span-full">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">
                          {searchQuery
                            ? "No lessons found matching your search."
                            : filter === "my-lessons"
                              ? "You haven't created any lessons yet."
                              : "No lessons found for this school."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <LessonWizard
        schoolId={schoolSlug}
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
      />
    </>
  );
}
