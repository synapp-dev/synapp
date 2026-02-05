"use client";

import { useState, useEffect, useMemo } from "react";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { LessonWizard } from "@/components/organisms/lesson-wizard";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSchoolStore } from "@/stores/school-store";
import { useLessons } from "@/entities/lessons/model/store";
import {
  BookOpen,
  Plus,
  Loader2,
  Calendar,
  Search,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { getDisplayStatus } from "@/utils/lesson-status";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useCurrentUser } from "@/entities/me/api/getCurrentUser";
import { topicsApi } from "@/entities/topics/api/endpoints";
import { useSlideUrl } from "@/entities/topics/model/store-enhanced";
import { toStorageUrl } from "@/utils/supabase/storage-url";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";

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

// Component to handle topic thumbnail for lesson cards (matching lesson wizard style)
function LessonTopicThumbnail({ topicId, horizontal = false }: { topicId: string; horizontal?: boolean }) {
  const [hasError, setHasError] = useState(false);

  // Fetch topic with slides
  const { data: topicData, isLoading } = useQuery({
    queryKey: ["topic", topicId, "thumbnail"],
    queryFn: async () => {
      const result = await topicsApi.get.byId(topicId, {
        includeSlides: true,
        includeUrls: true,
      });
      if (result.error) {
        return null;
      }
      return result.data;
    },
    enabled: !!topicId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get first image slide
  const imageSlides = useMemo(() => {
    if (!topicData?.slides) return [];
    return topicData.slides
      .filter((slide: any) => slide.kind === "image")
      .sort((a: any, b: any) => a.orderIndex - b.orderIndex);
  }, [topicData?.slides]);

  const firstImageSlide = imageSlides[0];
  const slideId = firstImageSlide?.id;

  // Prefer signedUrl from API response, fall back to cached URL from store
  const cachedUrl = useSlideUrl(slideId);
  const imageUrl = firstImageSlide?.signedUrl || cachedUrl;

  if (isLoading) {
    return (
      <div className={`${horizontal ? 'h-full w-auto flex-shrink-0 aspect-video' : 'w-full aspect-video'} ${horizontal ? 'rounded-l-md' : 'rounded-t-md'} bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center`}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasError || !imageUrl) {
    return (
      <div className={`${horizontal ? 'h-full w-auto flex-shrink-0 aspect-video' : 'w-full aspect-video'} ${horizontal ? 'rounded-l-md' : 'rounded-t-md'} bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center`}>
        <Image
          src="/images/bp-small-logo.svg"
          alt="Bullyproof Logo"
          width={48}
          height={48}
          className="h-12 w-12 object-contain"
        />
      </div>
    );
  }

  return (
    <div className={`relative ${horizontal ? 'h-full w-auto flex-shrink-0 aspect-video' : 'w-full aspect-video'} ${horizontal ? 'rounded-l-md' : 'rounded-t-md'} overflow-hidden bg-muted`}>
      <Image
        src={toStorageUrl(imageUrl) ?? imageUrl}
        alt={topicData?.title || "Topic thumbnail"}
        fill
        className="object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

type Lesson = {
  id: string;
  schoolId: string;
  topicId: string;
  createdByUserId: string | null;
  status: string;
  scheduledFor: string | null;
  createdAt: string;
  topic?: { 
    title?: string;
    stageOrder?: number | null;
    stageId?: string;
    stageName?: string;
  } | null;
  teacher?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
  assignedClasses?: Array<{
    classId: string;
    className: string;
    classCode: string | null;
  }> | null;
};

// Component to fetch and display lesson card with topic details
function LessonCard({ 
  lesson, 
  schoolSlug,
  formatStatus,
  formatCreatedDate,
  getDisplayStatus,
}: { 
  lesson: Lesson; 
  schoolSlug: string;
  formatStatus: (status: string) => string;
  formatCreatedDate: (dateString: string) => string;
  getDisplayStatus: (status: string, scheduledFor: string | null) => string;
}) {
  // Fetch topic details to get stageOrder and stage info
  const { data: topicData } = useQuery({
    queryKey: ["topic", lesson.topicId, "card-details"],
    queryFn: async () => {
      const result = await topicsApi.get.byId(lesson.topicId, {
        includeSlides: true,
        includeUrls: false,
      });
      if (result.error) {
        return null;
      }
      return result.data;
    },
    enabled: !!lesson.topicId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch stage data for stage name
  const { data: stageData } = useQuery({
    queryKey: ["stage", topicData?.stageId || lesson.topic?.stageId, "name"],
    queryFn: async () => {
      const stageId = topicData?.stageId || lesson.topic?.stageId;
      if (!stageId) return null;
      const result = await curriculumApi.stages.byId(stageId);
      if (result.error) return null;
      return result.data;
    },
    enabled: !!(topicData?.stageId || lesson.topic?.stageId),
    staleTime: 5 * 60 * 1000,
  });

  const stageOrder = topicData?.stageOrder ?? lesson.topic?.stageOrder ?? null;
  const stageName = stageData?.name || null;
  const topicTitle = topicData?.title || lesson.topic?.title || "Untitled Lesson";
  const teacherName = lesson.teacher
    ? `${lesson.teacher.firstName || ""} ${lesson.teacher.lastName || ""}`.trim() || lesson.teacher.email || "Unknown Teacher"
    : "Unknown Teacher";

  // Check if topic has image slides to determine z-index
  const hasImageSlides = topicData?.slides?.some((slide: any) => slide.kind === "image") ?? false;

  return (
    <Link
      href={`/schools/${schoolSlug}/lessons/${lesson.id}`}
      className="block"
    >
      <Card className="hover:shadow-md transition-shadow h-full overflow-visible p-0 gap-0 flex flex-col relative border-0 bg-transparent shadow-none">
        {/* Status and Date tabs protruding from behind the card */}
        <div className="relative w-full h-0">
          {/* Status tab - protruding from top left */}
          <div className={`absolute -top-5 left-0 flex items-center px-4 py-2 bg-card border border-border rounded-md shadow-sm ${hasImageSlides ? 'z-0' : 'z-10'}`}>
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap pb-1">
              {formatStatus(getDisplayStatus(lesson.status, lesson.scheduledFor))}
            </span>
          </div>
          {/* Date tab with teacher name - protruding from top right */}
          <div className={`absolute -top-3 right-0 flex items-center px-4 py-2 bg-card border border-border rounded-md shadow-sm ${hasImageSlides ? 'z-0' : 'z-10'}`}>
            <span className="text-xs text-muted-foreground whitespace-nowrap pb-1">
              {teacherName} • {formatCreatedDate(lesson.createdAt)}
            </span>
          </div>
        </div>
        {/* CardHeader - Guideline area (minimal height, no border) */}
        <CardHeader className="p-1 pb-0.5 bg-card border-0 border-b-0 rounded-t-lg">
        </CardHeader>
        {/* CardContent - Thumbnail (maintaining aspect ratio, full width) */}
        <CardContent className="p-0 flex-1 flex items-center justify-center bg-card border-x border-border relative z-[1]">
          {lesson.topicId && (
            <LessonTopicThumbnail topicId={lesson.topicId} horizontal={false} />
          )}
        </CardContent>
        {/* CardFooter - Details (stage, L badge, topic title, classes) */}
        <CardFooter className="flex flex-col p-4 pt-3 gap-2 bg-card border border-border border-t-0 rounded-b-lg items-start">
          {/* Curriculum stage name */}
          {stageName && (
            <p className="text-xs font-medium text-muted-foreground">
              {stageName}
            </p>
          )}
          {/* Topic title with L badge */}
          <div className="flex items-center gap-2 min-w-0">
            {stageOrder !== null && stageOrder !== undefined && (
              <Badge
                variant="secondary"
                className="text-xs text-muted-foreground font-bold border-0 py-0 px-1.5 h-5 rounded-sm flex-shrink-0"
              >
                L{stageOrder}
              </Badge>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <CardTitle className="text-base font-semibold text-primary capitalize line-clamp-2 flex-1 cursor-default text-left">
                  {topicTitle}
                </CardTitle>
              </TooltipTrigger>
              <TooltipContent>
                <p>{topicTitle}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          {/* Classes */}
          {lesson.assignedClasses &&
            lesson.assignedClasses.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {lesson.assignedClasses.map((classItem) => (
                  <Badge
                    key={classItem.classId}
                    variant="outline"
                    className="text-xs py-0 px-1.5 h-5"
                  >
                    {classItem.className}
                  </Badge>
                ))}
              </div>
            )}
        </CardFooter>
      </Card>
    </Link>
  );
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
  const [filter, setFilter] = useState<"all" | "my-lessons" | "other-lessons">(
    "all"
  );
  const searchParams = useSearchParams();
  const { data: currentUser } = useCurrentUser();

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
  // When filter is "other-lessons" or "all", we need to separate them
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
    } else if (filter === "other-lessons") {
      lessonsToFilter = otherLessons;
    } else {
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
        <div className="flex items-center gap-2">
          <BookOpen className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Lessons</h1>
        </div>

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
            onValueChange={(value: "all" | "my-lessons" | "other-lessons") =>
              setFilter(value)
            }
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter lessons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Lessons</SelectItem>
              <SelectItem value="my-lessons">My Lessons</SelectItem>
              <SelectItem value="other-lessons">Other Lessons</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lessons Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Start New Lesson Card - Always First */}
            <button
              onClick={() => setIsWizardOpen(true)}
              className="block w-full text-center"
            >
              <Card className="hover:shadow-md transition-shadow h-full border-2 border-dashed border-muted-foreground/40 hover:border-primary/50 cursor-pointer flex flex-col">
                <CardHeader className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 py-4">
                    <div className="rounded-full bg-primary/10 p-3">
                      <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg text-center">
                      Start New Lesson
                    </CardTitle>
                    <p className="text-sm text-muted-foreground text-center">
                      Create a new lesson for your classes
                    </p>
                  </div>
                </CardHeader>
              </Card>
            </button>
            {[...Array(5)].map((_, i) => (
              <LessonCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Start New Lesson Card - Always First */}
            <button
              onClick={() => setIsWizardOpen(true)}
              className="block w-full text-center"
            >
              <Card className="hover:shadow-md transition-shadow h-full border-2 border-dashed border-muted-foreground/40 hover:border-primary/50 cursor-pointer flex flex-col">
                <CardHeader className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 py-4">
                    <div className="rounded-full bg-primary/10 p-3">
                      <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg text-center">
                      Start New Lesson
                    </CardTitle>
                    <p className="text-sm text-muted-foreground text-center">
                      Create a new lesson for your classes
                    </p>
                  </div>
                </CardHeader>
              </Card>
            </button>
            <div className="col-span-full">
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
          </div>
        ) : (
          <div className="space-y-8">
            {/* Start New Lesson Card - Always First */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <button
                onClick={() => setIsWizardOpen(true)}
                className="block w-full text-center"
              >
                <Card className="hover:shadow-md transition-shadow h-full border-2 border-dashed border-muted-foreground/40 hover:border-primary/50 cursor-pointer flex flex-col">
                  <CardHeader className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 py-4">
                      <div className="rounded-full bg-primary/10 p-3">
                        <Plus className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg text-center">
                        Start New Lesson
                      </CardTitle>
                      <p className="text-sm text-muted-foreground text-center">
                        Create a new lesson for your classes
                      </p>
                    </div>
                  </CardHeader>
                </Card>
              </button>
            </div>

            {/* My Lessons Section */}
            {filter !== "other-lessons" && filteredMyLessons.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">My Lessons</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredMyLessons.map((lesson) => (
                    <LessonCard 
                      key={lesson.id} 
                      lesson={lesson} 
                      schoolSlug={schoolSlug}
                      formatStatus={formatStatus}
                      formatCreatedDate={formatCreatedDate}
                      getDisplayStatus={getDisplayStatus}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other Lessons Section */}
            {filter !== "my-lessons" && filteredOtherLessons.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Other Lessons</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredOtherLessons.map((lesson) => (
                    <LessonCard 
                      key={lesson.id} 
                      lesson={lesson} 
                      schoolSlug={schoolSlug}
                      formatStatus={formatStatus}
                      formatCreatedDate={formatCreatedDate}
                      getDisplayStatus={getDisplayStatus}
                    />
                  ))}
                </div>
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
                              : filter === "other-lessons"
                                ? "No other lessons found."
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
