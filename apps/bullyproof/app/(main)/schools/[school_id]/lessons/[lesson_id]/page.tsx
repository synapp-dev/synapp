"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import {
  BookOpen,
  Users,
  Loader2,
  FileText,
  MessageSquare,
} from "lucide-react";
import { useLessonById } from "@/entities/lessons/api/useLessonById";
import { useParams } from "next/navigation";
import { usePageTitle } from "@/hooks/use-page-title";
import { useLessonStatusRealtime } from "@/hooks/use-lesson-status-realtime";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import Image from "next/image";
import { useTopicSlidesCacheStore } from "@/stores/topic-slides-cache-store";
import { classesApi } from "@/entities/classes/api/endpoints";
import { useMemo } from "react";
import { useMeStore } from "@/entities/me/model/store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

function getInitials(
  firstName?: string | null,
  lastName?: string | null
): string {
  const first = firstName?.charAt(0)?.toUpperCase() || "";
  const last = lastName?.charAt(0)?.toUpperCase() || "";
  return first + last || "?";
}

// Component to handle thumbnail image with error fallback
function ThumbnailImage({ slideId, alt }: { slideId: string; alt: string }) {
  const [hasError, setHasError] = useState(false);
  const getSlideUrl = useTopicSlidesCacheStore((state) => state.getSlideUrl);
  const cachedUrl = useTopicSlidesCacheStore(
    (state) => state.cache[slideId]?.url ?? null
  );
  const loading = useTopicSlidesCacheStore(
    (state) => state.loading[slideId] ?? false
  );
  const [imageUrl, setImageUrl] = useState<string | null>(cachedUrl);

  // Fetch URL using cache store (same as SlideRenderer)
  useEffect(() => {
    if (slideId && !slideId.startsWith("temp_")) {
      // If we already have a cached URL, use it immediately
      if (cachedUrl) {
        setImageUrl(cachedUrl);
        return;
      }

      // Otherwise, fetch it
      let cancelled = false;
      getSlideUrl(slideId).then((url) => {
        if (!cancelled) {
          setImageUrl(url);
        }
      });

      return () => {
        cancelled = true;
      };
    } else {
      setImageUrl(null);
    }
  }, [slideId, getSlideUrl, cachedUrl]);

  // Update when cached URL changes (for instant updates after cache updates)
  useEffect(() => {
    if (cachedUrl && !loading) {
      setImageUrl(cachedUrl);
    }
  }, [cachedUrl, loading]);

  if (loading && !imageUrl) {
    return (
      <div className="w-32 h-20 flex-shrink-0 rounded-md bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center aspect-video">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasError || !imageUrl) {
    return (
      <div className="w-32 h-20 flex-shrink-0 rounded-md bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center aspect-video">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative w-32 h-20 flex-shrink-0 rounded-md overflow-hidden bg-muted aspect-video">
      <Image
        src={imageUrl}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

// Full-width thumbnail component for the topic card
function FullWidthThumbnail({
  slideId,
  alt,
}: {
  slideId: string;
  alt: string;
}) {
  const [hasError, setHasError] = useState(false);
  const getSlideUrl = useTopicSlidesCacheStore((state) => state.getSlideUrl);
  const cachedUrl = useTopicSlidesCacheStore(
    (state) => state.cache[slideId]?.url ?? null
  );
  const loading = useTopicSlidesCacheStore(
    (state) => state.loading[slideId] ?? false
  );
  const [imageUrl, setImageUrl] = useState<string | null>(cachedUrl);

  useEffect(() => {
    if (slideId && !slideId.startsWith("temp_")) {
      if (cachedUrl) {
        setImageUrl(cachedUrl);
        return;
      }

      let cancelled = false;
      getSlideUrl(slideId).then((url) => {
        if (!cancelled) {
          setImageUrl(url);
        }
      });

      return () => {
        cancelled = true;
      };
    } else {
      setImageUrl(null);
    }
  }, [slideId, getSlideUrl, cachedUrl]);

  useEffect(() => {
    if (cachedUrl && !loading) {
      setImageUrl(cachedUrl);
    }
  }, [cachedUrl, loading]);

  if (loading && !imageUrl) {
    return (
      <div className="w-full aspect-video rounded-md bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasError || !imageUrl) {
    return (
      <div className="w-full aspect-video rounded-md bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
        <FileText className="h-12 w-12 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
      <Image
        src={imageUrl}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export default function LessonOverviewPage() {
  usePageTitle(["schools", "lessons", "overview"]);
  const params = useParams();
  const lesson_id = params?.lesson_id as string;
  const school_id = params?.school_id as string;

  const {
    data: lessonData,
    isLoading,
    isError,
    error,
  } = useLessonById(lesson_id);

  // Listen for real-time status changes
  useLessonStatusRealtime(lesson_id);

  // Fetch live state to get current slide information
  const { data: liveStateData, isLoading: isLoadingLiveState } = useQuery({
    queryKey: ["lesson-live-state", lesson_id],
    queryFn: async () => {
      const result = await lessonsApi.liveState.get.byLessonId(lesson_id);
      if (result.error) {
        console.error("Failed to fetch live state:", result.error);
        return null;
      }
      return result.data;
    },
    enabled: !!lesson_id,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch year codes for assigned classes by fetching each class individually
  const classIds = useMemo(
    () => lessonData?.assignedClasses?.map((c) => c.classId) || [],
    [lessonData?.assignedClasses]
  );

  // Fetch each class individually to get year codes
  const { data: classesData } = useQuery<
    Map<string, { id: string; yearCodes: string[] }>
  >({
    queryKey: ["classes-with-years", classIds],
    queryFn: async () => {
      if (classIds.length === 0) return new Map();

      // Fetch all classes in parallel
      const classPromises = classIds.map(async (classId) => {
        try {
          const result = await classesApi.get.byId(classId);
          if (result.error) {
            console.error(`Failed to fetch class ${classId}:`, result.error);
            return null;
          }
          // Extract year codes from the years array
          // The years array contains objects with yearCode property
          const yearCodes =
            result.data?.years
              ?.map((year: any) => year.yearCode)
              .filter((code: string) => code != null && code !== undefined) ||
            [];
          return {
            id: classId,
            yearCodes,
          };
        } catch (error) {
          console.error(`Error fetching class ${classId}:`, error);
          return null;
        }
      });

      const results = await Promise.all(classPromises);
      const classesMap = new Map<string, { id: string; yearCodes: string[] }>();

      results.forEach((classData) => {
        if (classData) {
          classesMap.set(classData.id, classData);
        }
      });

      return classesMap;
    },
    enabled: classIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate slide progress information from lesson_live_state table
  // The liveState comes from the lesson_live_state table with fields:
  // - lessonId/lesson_id (primary key)
  // - currentSlideId/current_slide_id (uuid reference to topic_slides)
  // - currentIndex/current_index (integer, 0-based slide position)
  // - isPaused/is_paused (boolean)
  // - updatedBy/updated_by (uuid reference to auth.users)
  // - updatedAt/updated_at (timestamp)
  const liveState = liveStateData?.liveState;
  const slides = liveStateData?.slides ?? [];
  const totalSlides = slides.length;
  // Handle both camelCase (from Drizzle API) and snake_case (from Supabase direct) formats
  const currentSlideIndex =
    (liveState as any)?.currentIndex ?? (liveState as any)?.current_index ?? 0;
  const currentSlideNumber = currentSlideIndex + 1; // 1-indexed for display
  // Lesson is in progress if: has slides, has live state, current slide > 1, and current slide < last slide
  const isInProgress =
    totalSlides > 0 &&
    liveState !== null &&
    currentSlideNumber > 1 &&
    currentSlideNumber < totalSlides;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading lesson details...</p>
        </div>
      </div>
    );
  }

  if (isError || !lessonData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive font-medium">
            {error?.message || "Failed to load lesson details"}
          </p>
          <p className="text-muted-foreground mt-2">
            {error?.message?.includes("Unauthorized")
              ? "You don't have permission to view this lesson"
              : "Please try again later"}
          </p>
        </div>
      </div>
    );
  }

  const teacherName = lessonData.teacher
    ? `${lessonData.teacher.firstName || ""} ${lessonData.teacher.lastName || ""}`.trim() ||
      lessonData.teacher.email ||
      "Unknown Teacher"
    : "Unknown Teacher";

  const teacherInitials = lessonData.teacher
    ? getInitials(lessonData.teacher.firstName, lessonData.teacher.lastName)
    : "?";

  // Determine lesson state
  const isCompleted = lessonData.status === "completed";
  const isPendingReview = lessonData.status === "pending_review";
  const canProvideFeedback = isCompleted || isPendingReview;
  const currentSlide = slides[currentSlideIndex];
  const hasSlides = totalSlides > 0;
  const deliverUrl = `/schools/${school_id}/lessons/${lesson_id}/deliver?dialog=present`;

  // Check if current user is the lesson creator
  const currentUser = useMeStore((s) => s.currentUser);
  const isLessonCreator = currentUser?.id === lessonData.createdByUserId;
  const canDeliver = isLessonCreator;

  return (
    <div className="space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Topic Card and Right Column (Teacher & Classes + Feedback) */}
        <div className="grid grid-cols-2 gap-6 items-stretch">
          {/* Topic Card - Left half, full height */}
          <div className="flex h-full">
            {hasSlides ? (
              canDeliver ? (
                <Link href={deliverUrl} className="block h-full w-full">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Topic
                        {isInProgress && (
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          >
                            In Progress
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-4">
                      {/* Big Thumbnail Full Width */}
                      {!isLoadingLiveState &&
                      liveState !== null &&
                      currentSlide &&
                      currentSlide.kind === "image" ? (
                        <FullWidthThumbnail
                          slideId={currentSlide.topicSlideId}
                          alt={`Slide ${currentSlideNumber} preview`}
                        />
                      ) : !isLoadingLiveState && liveState !== null ? (
                        <div className="w-full aspect-video rounded-md bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                          <FileText className="h-12 w-12 text-muted-foreground" />
                        </div>
                      ) : null}

                      {/* Topic Title */}
                      <p className="text-lg font-medium">
                        {lessonData.topic?.title || "No topic assigned"}
                      </p>

                      {/* Slide Count */}
                      {!isLoadingLiveState && liveState !== null && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span>
                            Slide {currentSlideNumber} of {totalSlides}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="h-full w-full">
                      <Card className="opacity-50 cursor-not-allowed h-full flex flex-col">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5" />
                            Topic
                            {isInProgress && (
                              <Badge
                                variant="secondary"
                                className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              >
                                In Progress
                              </Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-4">
                          {/* Big Thumbnail Full Width */}
                          {!isLoadingLiveState &&
                          liveState !== null &&
                          currentSlide &&
                          currentSlide.kind === "image" ? (
                            <FullWidthThumbnail
                              slideId={currentSlide.topicSlideId}
                              alt={`Slide ${currentSlideNumber} preview`}
                            />
                          ) : !isLoadingLiveState && liveState !== null ? (
                            <div className="w-full aspect-video rounded-md bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                              <FileText className="h-12 w-12 text-muted-foreground" />
                            </div>
                          ) : null}

                          {/* Topic Title */}
                          <p className="text-lg font-medium">
                            {lessonData.topic?.title || "No topic assigned"}
                          </p>

                          {/* Slide Count */}
                          {!isLoadingLiveState && liveState !== null && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <FileText className="h-4 w-4" />
                              <span>
                                Slide {currentSlideNumber} of {totalSlides}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Only the teacher who created the lesson can present</p>
                  </TooltipContent>
                </Tooltip>
              )
            ) : (
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Topic
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  {/* Placeholder for thumbnail */}
                  <div className="relative w-full aspect-video rounded-md bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                  </div>

                  {/* Topic Title */}
                  <p className="text-lg font-medium">
                    {lessonData.topic?.title || "No topic assigned"}
                  </p>

                  {/* No slides message */}
                  {!isLoadingLiveState && totalSlides === 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>No slides available</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Teacher & Classes (top) and Feedback (bottom) */}
          <div className="flex flex-col gap-6 h-full">
            {/* Teacher & Classes Card - Top half */}
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Teacher & Classes
                </CardTitle>
                <CardDescription>
                  {lessonData.assignedClasses?.length || 0} class
                  {(lessonData.assignedClasses?.length || 0) !== 1
                    ? "es"
                    : ""}{" "}
                  taking this lesson
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Teacher Section */}
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {teacherInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-lg">{teacherName}</p>
                      {lessonData.teacher?.email && (
                        <p className="text-sm text-muted-foreground">
                          {lessonData.teacher.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Classes Section */}
                  {lessonData.assignedClasses &&
                  lessonData.assignedClasses.length > 0 ? (
                    <div className="space-y-3">
                      {lessonData.assignedClasses.map((assignedClass) => {
                        const classData = classesData?.get(
                          assignedClass.classId
                        );
                        const yearCodes = classData?.yearCodes || [];
                        return (
                          <div
                            key={assignedClass.classId}
                            className="p-4 border rounded-lg hover:bg-accent transition-colors"
                          >
                            <p className="font-medium mb-2">
                              {assignedClass.className}
                            </p>
                            {yearCodes.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {yearCodes.map((yearCode) => (
                                  <Badge
                                    key={yearCode}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {yearCode}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No classes assigned</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Feedback Card - Bottom half */}
            <Card
              className={`flex-1 ${canProvideFeedback ? "" : "opacity-50"}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Feedback
                </CardTitle>
                <CardDescription>
                  {isPendingReview
                    ? "Provide feedback to mark this lesson as completed"
                    : isCompleted
                      ? "View your feedback for this lesson"
                      : "Share your experience and mark this lesson as completed"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canProvideFeedback ? (
                  <Link
                    href={`/schools/${school_id}/lessons/${lesson_id}/feedback`}
                  >
                    <Button variant="outline" className="w-full">
                      {isPendingReview ? "Provide Feedback" : "View Feedback"}
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    Complete lesson to provide feedback
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
