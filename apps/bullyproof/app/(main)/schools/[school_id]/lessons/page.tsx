"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient, useInfiniteQuery, useQueries } from "@tanstack/react-query";
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
import { lessonsKeys } from "@/entities/lessons/model/keys";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { Separator } from "@workspace/ui/components/separator";
import { format } from "date-fns";
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
import { getLessonByIdOptions } from "@/entities/lessons/api/useLessonById";
import { StartNewLessonCard } from "@/entities/lessons/ui/start-new-lesson-card";
import { SchoolPageCompactHeader } from "@/components/molecules/school-page-compact-header";
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

function getTeacherNameForLesson(lesson: Lesson) {
  if (lesson.teacher) {
    const firstName = lesson.teacher.firstName || "";
    const lastName = lesson.teacher.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || lesson.teacher.email || "Unknown Teacher";
  }
  return "Unknown Teacher";
}

/** Merges list row + detail query per card so sibling rows do not rerender when another lesson's detail loads. */
function LessonCardWithDetails({
  lesson,
  schoolSlug,
  enhancedHover,
}: {
  lesson: Lesson;
  schoolSlug: string;
  enhancedHover?: boolean;
}) {
  const { data: detail } = useQuery(getLessonByIdOptions(lesson.id));
  const mergedLesson = useMemo(() => {
    if (!detail) return lesson;
    return { ...lesson, ...detail } as Lesson;
  }, [lesson, detail]);

  return (
    <LessonCard
      lesson={mergedLesson}
      schoolSlug={schoolSlug}
      enhancedHover={enhancedHover}
    />
  );
}

export default function LessonsPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const ALL_LESSONS_PAGE_SIZE = 10;
  const [schoolId, setSchoolId] = useState<string>("");

  useEffect(() => {
    params.then(({ school_id }) => setSchoolId(school_id));
  }, [params]);
  usePageTitle(["schools", "lessons"]);
  const queryClient = useQueryClient();
  const currentSchool = useSchoolStore((state) => state.currentSchool);

  // Invalidate lessons on mount so we always get fresh data when visiting this page
  // (e.g. after updating lesson status via presentation mode elsewhere)
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: lessonsKeys.all() });
  }, [queryClient]);
  const [schoolSlug, setSchoolSlug] = useState<string>("");
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  // Search and show-completed controls removed at client request (22 Jun
  // review): completed lessons are visible per class on the Classes page.
  const searchQuery = "";
  const showCompletedMyLessons = false;
  const showCompletedOtherLessons = false;
  const [showContentAnimation, setShowContentAnimation] = useState(false);
  const loadMoreOtherLessonsRef = useRef<HTMLDivElement | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: currentUser } = useCurrentUser();
  const banner = useStorageImageUrl(currentSchool?.bannerUrl ?? null);
  const avatar = useStorageImageUrl(currentSchool?.avatarUrl ?? null);
  const headerReady = !(!!currentSchool?.bannerUrl && banner.loading) && !(!!currentSchool?.avatarUrl && avatar.loading);

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

  // Check for dialog query parameter and open wizard if present (once per param presence)
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

  // When wizard closes, remove dialog param from URL so we don't re-open on next effect run
  const handleWizardOpenChange = (open: boolean) => {
    setIsWizardOpen(open);
    if (!open) {
      const params = new URLSearchParams(searchParams?.toString() || "");
      const hadDialog =
        params.get("dialog") === "add-new-lesson" ||
        params.get("startingYourLesson") === "true";
      if (hadDialog) {
        params.delete("dialog");
        params.delete("startingYourLesson");
        const queryString = params.toString();
        router.replace(
          `${pathname}${queryString ? `?${queryString}` : ""}`,
          { scroll: false }
        );
      }
    }
  };

  const fetchLessonsPage = async (
    pageParam: number,
    params: {
      schoolId?: string;
      teacherId?: string;
      status?: string;
    }
  ) => {
    const result = await lessonsApi.get.list({
      ...params,
      limit: ALL_LESSONS_PAGE_SIZE,
      offset: pageParam,
    });
    if (result.error) {
      throw new Error(result.error.message || "Failed to fetch lessons");
    }
    return result.data ?? [];
  };

  // My Lessons: only fetch the status stream matching the current toggle.
  const myActiveLessonsQuery = useInfiniteQuery({
    queryKey: ["lessons", "my", "active", currentSchool?.id, currentUser?.id],
    enabled:
      !!currentSchool?.id && !!currentUser?.id && !showCompletedMyLessons,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchLessonsPage(pageParam, {
        schoolId: currentSchool?.id,
        teacherId: currentUser?.id,
        status: "active",
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < ALL_LESSONS_PAGE_SIZE
        ? undefined
        : allPages.length * ALL_LESSONS_PAGE_SIZE,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const myCompletedLessonsQuery = useInfiniteQuery({
    queryKey: ["lessons", "my", "completed", currentSchool?.id, currentUser?.id],
    enabled:
      !!currentSchool?.id && !!currentUser?.id && showCompletedMyLessons,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchLessonsPage(pageParam, {
        schoolId: currentSchool?.id,
        teacherId: currentUser?.id,
        status: "completed",
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < ALL_LESSONS_PAGE_SIZE
        ? undefined
        : allPages.length * ALL_LESSONS_PAGE_SIZE,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Other Lessons: only fetch the stream matching the current toggle.
  const otherActiveLessonsQuery = useInfiniteQuery({
    queryKey: ["lessons", "other", "active", currentSchool?.id, currentUser?.id],
    enabled:
      filter === "all" && !!currentSchool?.id && !showCompletedOtherLessons,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchLessonsPage(pageParam, {
        schoolId: currentSchool?.id,
        status: "active",
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < ALL_LESSONS_PAGE_SIZE
        ? undefined
        : allPages.length * ALL_LESSONS_PAGE_SIZE,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const otherCompletedLessonsQuery = useInfiniteQuery({
    queryKey: ["lessons", "other", "completed", currentSchool?.id, currentUser?.id],
    enabled:
      filter === "all" && !!currentSchool?.id && showCompletedOtherLessons,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchLessonsPage(pageParam, {
        schoolId: currentSchool?.id,
        status: "completed",
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < ALL_LESSONS_PAGE_SIZE
        ? undefined
        : allPages.length * ALL_LESSONS_PAGE_SIZE,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Drain pages only for the visible My Lessons stream.
  useEffect(() => {
    if (showCompletedMyLessons) {
      if (
        !myCompletedLessonsQuery.hasNextPage ||
        myCompletedLessonsQuery.isFetchingNextPage
      ) {
        return;
      }
      void myCompletedLessonsQuery.fetchNextPage();
      return;
    }
    if (
      !myActiveLessonsQuery.hasNextPage ||
      myActiveLessonsQuery.isFetchingNextPage
    ) {
      return;
    }
    void myActiveLessonsQuery.fetchNextPage();
  }, [
    showCompletedMyLessons,
    myActiveLessonsQuery.hasNextPage,
    myActiveLessonsQuery.isFetchingNextPage,
    myActiveLessonsQuery.fetchNextPage,
    myCompletedLessonsQuery.hasNextPage,
    myCompletedLessonsQuery.isFetchingNextPage,
    myCompletedLessonsQuery.fetchNextPage,
  ]);

  const hasMoreOtherLessons =
    filter === "all" &&
    (showCompletedOtherLessons
      ? !!otherCompletedLessonsQuery.hasNextPage
      : !!otherActiveLessonsQuery.hasNextPage);

  // Infinite scroll for Other Lessons: fetch next pages only at bottom.
  useEffect(() => {
    if (
      filter !== "all" ||
      !hasMoreOtherLessons ||
      !loadMoreOtherLessonsRef.current
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;

        if (showCompletedOtherLessons) {
          if (
            otherCompletedLessonsQuery.hasNextPage &&
            !otherCompletedLessonsQuery.isFetchingNextPage
          ) {
            void otherCompletedLessonsQuery.fetchNextPage();
          }
        } else if (
          otherActiveLessonsQuery.hasNextPage &&
          !otherActiveLessonsQuery.isFetchingNextPage
        ) {
          void otherActiveLessonsQuery.fetchNextPage();
        }
      },
      { rootMargin: "200px 0px" }
    );

    observer.observe(loadMoreOtherLessonsRef.current);
    return () => observer.disconnect();
  }, [
    filter,
    hasMoreOtherLessons,
    showCompletedOtherLessons,
    otherActiveLessonsQuery.hasNextPage,
    otherActiveLessonsQuery.isFetchingNextPage,
    otherActiveLessonsQuery.fetchNextPage,
    otherCompletedLessonsQuery.hasNextPage,
    otherCompletedLessonsQuery.isFetchingNextPage,
    otherCompletedLessonsQuery.fetchNextPage,
  ]);

  const myActiveLessonsRaw = useMemo(
    () => myActiveLessonsQuery.data?.pages.flat() ?? [],
    [myActiveLessonsQuery.data]
  );
  const myCompletedLessonsRaw = useMemo(
    () => myCompletedLessonsQuery.data?.pages.flat() ?? [],
    [myCompletedLessonsQuery.data]
  );
  const otherActiveLessonsRaw = useMemo(
    () => (otherActiveLessonsQuery.data?.pages.flat() ?? []).filter((lesson) => lesson.createdByUserId !== currentUser?.id),
    [otherActiveLessonsQuery.data, currentUser?.id]
  );
  const otherCompletedLessonsRaw = useMemo(
    () => (otherCompletedLessonsQuery.data?.pages.flat() ?? []).filter((lesson) => lesson.createdByUserId !== currentUser?.id),
    [otherCompletedLessonsQuery.data, currentUser?.id]
  );

  const sortLessonsByCreatedDesc = (a: Lesson, b: Lesson) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

  const myActiveLessons = useMemo(
    () => [...(myActiveLessonsRaw as Lesson[])].sort(sortLessonsByCreatedDesc),
    [myActiveLessonsRaw]
  );
  const myCompletedLessons = useMemo(
    () => [...(myCompletedLessonsRaw as Lesson[])].sort(sortLessonsByCreatedDesc),
    [myCompletedLessonsRaw]
  );
  const otherActiveLessons = useMemo(
    () => [...(otherActiveLessonsRaw as Lesson[])].sort(sortLessonsByCreatedDesc),
    [otherActiveLessonsRaw]
  );
  const otherCompletedLessons = useMemo(
    () => [...(otherCompletedLessonsRaw as Lesson[])].sort(sortLessonsByCreatedDesc),
    [otherCompletedLessonsRaw]
  );

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

  const myLessons = useMemo(
    () => (showCompletedMyLessons ? myCompletedLessons : myActiveLessons),
    [showCompletedMyLessons, myCompletedLessons, myActiveLessons]
  );

  const otherLessons = useMemo(
    () => (showCompletedOtherLessons ? otherCompletedLessons : otherActiveLessons),
    [showCompletedOtherLessons, otherCompletedLessons, otherActiveLessons]
  );

  /** Detail subscriptions only for visible lists (search enrichment; shared cache with per-card fetches). */
  const allLessonIdsForSearch = useMemo(() => {
    const all = [
      ...myLessons,
      ...(filter === "all" ? otherLessons : []),
    ];
    const deduped = new Map<string, Lesson>();
    all.forEach((lesson) => {
      if (!deduped.has(lesson.id)) deduped.set(lesson.id, lesson);
    });
    return Array.from(deduped.values());
  }, [myLessons, otherLessons, filter]);

  const lessonDetailQueries = useQueries({
    queries: allLessonIdsForSearch.map((lesson) => getLessonByIdOptions(lesson.id)),
  });

  const lessonDetailsById = useMemo(() => {
    const map = new Map<string, Lesson>();
    lessonDetailQueries.forEach((query) => {
      if (query.data?.id) map.set(query.data.id, query.data as Lesson);
    });
    return map;
  }, [lessonDetailQueries]);

  const queryErrors = [
    myActiveLessonsQuery.error,
    myCompletedLessonsQuery.error,
    otherActiveLessonsQuery.error,
    otherCompletedLessonsQuery.error,
    lessonDetailQueries.find((q) => q.error)?.error,
  ].filter(Boolean);

  const loading = [
    showCompletedMyLessons
      ? myCompletedLessonsQuery.isLoading
      : myActiveLessonsQuery.isLoading,
    filter === "all"
      ? showCompletedOtherLessons
        ? otherCompletedLessonsQuery.isLoading
        : otherActiveLessonsQuery.isLoading
      : false,
  ].some(Boolean);

  const isError = queryErrors.length > 0;
  const error = isError
    ? queryErrors[0] instanceof Error
      ? (queryErrors[0] as Error).message
      : "Failed to load lessons"
    : null;

  const filteredMyLessons = useMemo(() => {
    if (!searchQuery.trim()) return myLessons;
    return myLessons.filter((lesson) => {
      const enriched = lessonDetailsById.has(lesson.id)
        ? ({ ...lesson, ...lessonDetailsById.get(lesson.id)! } as Lesson)
        : lesson;
      const topicTitle = enriched.topic?.title || "";
      const teacherName = getTeacherNameForLesson(enriched);
      const status = getDisplayStatus(enriched.status || "", enriched.scheduledFor);
      const classNames =
        enriched.assignedClasses?.map((c) => c.className).join(" ") || "";

      return (
        fuzzySearch(searchQuery, topicTitle) ||
        fuzzySearch(searchQuery, teacherName) ||
        fuzzySearch(searchQuery, status) ||
        fuzzySearch(searchQuery, classNames)
      );
    });
  }, [myLessons, searchQuery, lessonDetailsById]);

  const filteredOtherLessons = useMemo(() => {
    if (!searchQuery.trim()) return otherLessons;
    return otherLessons.filter((lesson) => {
      const enriched = lessonDetailsById.has(lesson.id)
        ? ({ ...lesson, ...lessonDetailsById.get(lesson.id)! } as Lesson)
        : lesson;
      const topicTitle = enriched.topic?.title || "";
      const teacherName = getTeacherNameForLesson(enriched);
      const status = getDisplayStatus(enriched.status || "", enriched.scheduledFor);
      const classNames =
        enriched.assignedClasses?.map((c) => c.className).join(" ") || "";

      return (
        fuzzySearch(searchQuery, topicTitle) ||
        fuzzySearch(searchQuery, teacherName) ||
        fuzzySearch(searchQuery, status) ||
        fuzzySearch(searchQuery, classNames)
      );
    });
  }, [otherLessons, searchQuery, lessonDetailsById]);

  const displayedMyLessons = filteredMyLessons;
  const displayedOtherLessons = filteredOtherLessons;

  const filteredLessons = useMemo(
    () =>
      [...filteredMyLessons, ...(filter === "all" ? filteredOtherLessons : [])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [filteredMyLessons, filteredOtherLessons, filter]
  );

  const displayedAllLessonsCombined = useMemo(
    () =>
      [...displayedMyLessons, ...displayedOtherLessons].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [displayedMyLessons, displayedOtherLessons]
  );

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

  const EmptyLessonPlaceholderCard = () => (
    <Card className="h-full overflow-visible p-0 gap-0 flex flex-col relative border-0 shadow-none bg-transparent">
      <CardHeader className="py-3 px-4 bg-card/80 border border-b-0 rounded-t-lg flex flex-row items-center border-muted-foreground/30 border-dashed">
        <span className="h-3 w-16 rounded-sm bg-muted-foreground/5" />
      </CardHeader>
      <CardContent className="p-0 flex-1 flex items-center justify-center bg-card/80 border-x border-muted-foreground/30 border-dashed">
        <div className="w-full aspect-video rounded-t-md rounded-b-none bg-muted/10" />
      </CardContent>
      <CardFooter className="flex flex-col p-4 pt-3 gap-2 bg-card/80 border border-t-0 rounded-b-lg items-start border-muted-foreground/30 border-dashed">
        <div className="h-1.5 w-20 rounded-sm bg-muted-foreground/5" />
        <div className="h-5 w-40 rounded-sm bg-muted-foreground/5" />
        <div className="flex flex-wrap gap-1 mt-1">
          <span className="h-5 w-16 rounded-full border border-dashed border-muted-foreground/30" />
        </div>
      </CardFooter>
    </Card>
  );

  const myLessonsPlaceholderCount =
    !searchQuery.trim() &&
    filter === "my-lessons" &&
    displayedMyLessons.length < 2
      ? 2 - displayedMyLessons.length
      : 0;

  if (!currentSchool) {
    return (
      <>
        <FeatureGuard feature="/school/lessons" schoolId={currentSchool?.id} />
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
      <FeatureGuard feature="/school/lessons" schoolId={currentSchool.id} />
      <div className="space-y-6">
        <SchoolPageCompactHeader
          bannerUrl={banner.url}
          avatarUrl={avatar.url}
          title="Teach Lessons"
          description="View, manage and create all of your lessons here."
          isLoading={!headerReady}
          onAnimationComplete={() => setShowContentAnimation(true)}
        />

        {/* Search and Filter + Content - animates in after header */}
        <div
          className={`space-y-6 opacity-0 ${showContentAnimation ? "animate-slide-down-fade-in" : ""}`}
          style={
            showContentAnimation ? { animationFillMode: "forwards" } : undefined
          }
        >
        <div className="flex flex-col sm:flex-row justify-end gap-4">
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
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* Start New Lesson Card - Always First */}
                  <StartNewLessonCard onClick={() => setIsWizardOpen(true)} />
                  {displayedMyLessons.map((lesson) => (
                    <LessonCardWithDetails
                      key={lesson.id}
                      lesson={lesson}
                      schoolSlug={schoolSlug}
                      enhancedHover
                    />
                  ))}
                  {[...Array(myLessonsPlaceholderCount)].map((_, index) => (
                    <EmptyLessonPlaceholderCard
                      key={`my-lessons-placeholder-${index}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Separator between sections */}
            {filter === "all" && displayedAllLessonsCombined.length > 0 && (
              <Separator />
            )}

            {/* Other Lessons Section */}
            {filter === "all" && displayedAllLessonsCombined.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-semibold">Other Lessons</h2>
                </div>
                {displayedOtherLessons.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {displayedOtherLessons.map((lesson) => (
                      <LessonCardWithDetails
                        key={lesson.id}
                        lesson={lesson}
                        schoolSlug={schoolSlug}
                        enhancedHover
                      />
                    ))}
                    {(showCompletedOtherLessons
                      ? otherCompletedLessonsQuery.isFetchingNextPage
                      : otherActiveLessonsQuery.isFetchingNextPage) &&
                      [...Array(3)].map((_, i) => (
                        <LessonCardSkeleton key={`other-lessons-loading-${i}`} />
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No active lessons found. Completed lessons can be viewed per
                    class on the Classes page.
                  </p>
                )}
              </div>
            )}

            {filter === "all" && hasMoreOtherLessons && (
              <div ref={loadMoreOtherLessonsRef} className="h-1 w-full" aria-hidden="true" />
            )}

            {/* Empty State (search only) */}
            {filteredLessons.length === 0 && searchQuery.trim() && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="col-span-full">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">
                          No lessons found matching your search.
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
      </div>

      <LessonWizard
        schoolId={schoolSlug}
        open={isWizardOpen}
        onOpenChange={handleWizardOpenChange}
      />
    </>
  );
}
