"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQueryClient, useInfiniteQuery, useQueries } from "@tanstack/react-query";
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
import { Eye, EyeOff, Search } from "lucide-react";
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
import { StartNewLessonCard } from "@/entities/lessons/ui/start-new-lesson-card";
import { SchoolPageCompactHeader } from "@/components/molecules/school-page-compact-header";
import { useStorageImageUrl } from "@/hooks/use-storage-image-url";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [showCompletedMyLessons, setShowCompletedMyLessons] = useState(false);
  const [showCompletedOtherLessons, setShowCompletedOtherLessons] = useState(false);
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

  // Fetch My Lessons separately (active + completed), then choose mode in UI.
  const myActiveLessonsQuery = useInfiniteQuery({
    queryKey: ["lessons", "my", "active", currentSchool?.id, currentUser?.id],
    enabled: !!currentSchool?.id && !!currentUser?.id,
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
    enabled: !!currentSchool?.id && !!currentUser?.id,
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

  // Fetch Other Lessons as two separate streams (active + completed).
  const otherActiveLessonsQuery = useInfiniteQuery({
    queryKey: ["lessons", "other", "active", currentSchool?.id, currentUser?.id],
    enabled: filter === "all" && !!currentSchool?.id,
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
    enabled: filter === "all" && !!currentSchool?.id,
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

  // Fully drain paged results for My Lessons so all active lessons are displayed.
  useEffect(() => {
    if (!myActiveLessonsQuery.hasNextPage || myActiveLessonsQuery.isFetchingNextPage) return;
    void myActiveLessonsQuery.fetchNextPage();
  }, [myActiveLessonsQuery.hasNextPage, myActiveLessonsQuery.isFetchingNextPage, myActiveLessonsQuery.fetchNextPage]);

  useEffect(() => {
    if (!myCompletedLessonsQuery.hasNextPage || myCompletedLessonsQuery.isFetchingNextPage) return;
    void myCompletedLessonsQuery.fetchNextPage();
  }, [myCompletedLessonsQuery.hasNextPage, myCompletedLessonsQuery.isFetchingNextPage, myCompletedLessonsQuery.fetchNextPage]);

  const hasMoreOtherLessons =
    filter === "all" &&
    (!!otherActiveLessonsQuery.hasNextPage || !!otherCompletedLessonsQuery.hasNextPage);

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

        if (
          otherActiveLessonsQuery.hasNextPage &&
          !otherActiveLessonsQuery.isFetchingNextPage
        ) {
          void otherActiveLessonsQuery.fetchNextPage();
        }

        if (
          otherCompletedLessonsQuery.hasNextPage &&
          !otherCompletedLessonsQuery.isFetchingNextPage
        ) {
          void otherCompletedLessonsQuery.fetchNextPage();
        }
      },
      { rootMargin: "200px 0px" }
    );

    observer.observe(loadMoreOtherLessonsRef.current);
    return () => observer.disconnect();
  }, [
    filter,
    hasMoreOtherLessons,
    otherActiveLessonsQuery,
    otherCompletedLessonsQuery,
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

  const allRawLessonsForDetails = useMemo(() => {
    const all = [
      ...myActiveLessonsRaw,
      ...myCompletedLessonsRaw,
      ...otherActiveLessonsRaw,
      ...otherCompletedLessonsRaw,
    ];
    const deduped = new Map<string, Lesson>();
    all.forEach((lesson) => {
      if (!deduped.has(lesson.id)) deduped.set(lesson.id, lesson as Lesson);
    });
    return Array.from(deduped.values());
  }, [
    myActiveLessonsRaw,
    myCompletedLessonsRaw,
    otherActiveLessonsRaw,
    otherCompletedLessonsRaw,
  ]);

  const lessonDetailQueries = useQueries({
    queries: allRawLessonsForDetails.map((lesson) => ({
      queryKey: lessonsKeys.detail(lesson.id),
      queryFn: async () => {
        const result = await lessonsApi.get.byId(lesson.id);
        if (result.error) {
          throw new Error(result.error.message || "Failed to fetch lesson details");
        }
        return result.data ?? null;
      },
      staleTime: 2 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
      initialData: () => queryClient.getQueryData<Lesson | null>(lessonsKeys.detail(lesson.id)),
    })),
  });

  const lessonDetailsById = useMemo(() => {
    const map = new Map<string, Lesson>();
    lessonDetailQueries.forEach((query) => {
      if (query.data?.id) map.set(query.data.id, query.data as Lesson);
    });
    return map;
  }, [lessonDetailQueries]);

  const hydrateLessons = useMemo(
    () => (input: Lesson[]) =>
      input
        .map((lesson) => {
          const cached = queryClient.getQueryData<Lesson | null>(lessonsKeys.detail(lesson.id));
          if (cached) return { ...lesson, ...cached } as Lesson;
          const detailed = lessonDetailsById.get(lesson.id);
          return detailed ? ({ ...lesson, ...detailed } as Lesson) : lesson;
        })
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [lessonDetailsById, queryClient]
  );

  const myActiveLessons = useMemo(() => hydrateLessons(myActiveLessonsRaw as Lesson[]), [hydrateLessons, myActiveLessonsRaw]);
  const myCompletedLessons = useMemo(() => hydrateLessons(myCompletedLessonsRaw as Lesson[]), [hydrateLessons, myCompletedLessonsRaw]);
  const otherActiveLessons = useMemo(() => hydrateLessons(otherActiveLessonsRaw as Lesson[]), [hydrateLessons, otherActiveLessonsRaw]);
  const otherCompletedLessons = useMemo(() => hydrateLessons(otherCompletedLessonsRaw as Lesson[]), [hydrateLessons, otherCompletedLessonsRaw]);

  const queryErrors = [
    myActiveLessonsQuery.error,
    myCompletedLessonsQuery.error,
    otherActiveLessonsQuery.error,
    otherCompletedLessonsQuery.error,
    lessonDetailQueries.find((q) => q.error)?.error,
  ].filter(Boolean);

  const loading = [
    myActiveLessonsQuery.isLoading,
    myCompletedLessonsQuery.isLoading,
    filter === "all" ? otherActiveLessonsQuery.isLoading : false,
    filter === "all" ? otherCompletedLessonsQuery.isLoading : false,
  ].some(Boolean);

  const isError = queryErrors.length > 0;
  const error = isError
    ? queryErrors[0] instanceof Error
      ? (queryErrors[0] as Error).message
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

  const myLessons = useMemo(
    () => (showCompletedMyLessons ? myCompletedLessons : myActiveLessons),
    [showCompletedMyLessons, myCompletedLessons, myActiveLessons]
  );

  const otherLessons = useMemo(
    () => (showCompletedOtherLessons ? otherCompletedLessons : otherActiveLessons),
    [showCompletedOtherLessons, otherCompletedLessons, otherActiveLessons]
  );

  const filterLessonListBySearch = (lessonsToFilter: Lesson[]) => {
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
  };

  const filteredMyLessons = useMemo(
    () => filterLessonListBySearch(myLessons),
    [myLessons, searchQuery]
  );

  const filteredOtherLessons = useMemo(
    () => filterLessonListBySearch(otherLessons),
    [otherLessons, searchQuery]
  );

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

  const AnimatedLessonGridItem = ({
    index,
    children,
  }: {
    index: number;
    children: React.ReactNode;
  }) => {
    if (!showContentAnimation) {
      return <div className="opacity-0">{children}</div>;
    }

    return (
      <StaggeredAnimation index={index} fadeDirection="left">
        {children}
      </StaggeredAnimation>
    );
  };

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
          title="Lessons"
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
                        Show active
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
                  <AnimatedLessonGridItem index={0}>
                    <StartNewLessonCard onClick={() => setIsWizardOpen(true)} />
                  </AnimatedLessonGridItem>
                  {displayedMyLessons.map((lesson, index) => (
                    <AnimatedLessonGridItem key={lesson.id} index={index + 1}>
                      <LessonCard
                        lesson={lesson}
                        schoolSlug={schoolSlug}
                        enhancedHover
                      />
                    </AnimatedLessonGridItem>
                  ))}
                  {[...Array(myLessonsPlaceholderCount)].map((_, index) => (
                    <AnimatedLessonGridItem
                      key={`my-lessons-placeholder-${index}`}
                      index={displayedMyLessons.length + index + 1}
                    >
                      <EmptyLessonPlaceholderCard />
                    </AnimatedLessonGridItem>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCompletedOtherLessons(!showCompletedOtherLessons)}
                    className="text-muted-foreground"
                  >
                    {showCompletedOtherLessons ? (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Show active
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
                    {displayedOtherLessons.map((lesson, index) => (
                      <AnimatedLessonGridItem key={lesson.id} index={index}>
                        <LessonCard
                          lesson={lesson}
                          schoolSlug={schoolSlug}
                          enhancedHover
                        />
                      </AnimatedLessonGridItem>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {showCompletedOtherLessons
                      ? 'No completed lessons found. Click "Show active" to see active lessons.'
                      : 'No active lessons found. Click "Show completed" to see completed lessons.'}
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
