"use client";

import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Link from "next/link";
import {
  Book,
  FileText,
  GraduationCap,
  Users,
  Play,
  BookOpen,
  Loader2,
  BadgeCheck,
  TvMinimalPlay,
} from "lucide-react";
import { Separator } from "@workspace/ui/components/separator";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useMeStore } from "@/entities/me/model/store";
import { useSchoolStore } from "@/stores/school-store";
import { useMySchoolsQuery } from "@/entities/me/model/useMySchoolsQuery";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserLessonsStatusRealtime } from "@/hooks/use-lesson-status-realtime";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { Badge } from "@workspace/ui/components/badge";
import Image from "next/image";
import { useTopicSlidesCacheStore } from "@/stores/topic-slides-cache-store";
import { useCertificationSlidesCacheStore } from "@/stores/certification-slides-cache-store";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@workspace/ui/components/tooltip";
import { Progress } from "@workspace/ui/components/progress";
import { certificationApi } from "@/entities/certification/api/endpoints";
import CountUp from "react-countup";

function QuickActionsCard({
  title,
  icon,
  link,
  disabled,
}: {
  title: string;
  icon: React.ReactNode;
  link: string;
  disabled?: boolean;
}) {
  const words = title.split(" ");
  const firstWord = words[0] || "";
  const secondWord = words.slice(1).join(" ");

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow cursor-pointer p-0 flex-1 flex",
        disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
      )}
    >
      <Link
        href={disabled ? "#" : link}
        className="w-full h-full flex items-center gap-1 p-2"
      >
        <div className="p-1 rounded flex-shrink-0">{icon}</div>
        <span className="text-sm">
          <span className="font-light">{firstWord}</span>
          {secondWord && (
            <>
              {" "}
              <span className="font-medium">{secondWord}</span>
            </>
          )}
        </span>
      </Link>
    </Card>
  );
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
      <div className="w-full rounded-md bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center aspect-video">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasError || !imageUrl) {
    return (
      <div className="w-full rounded-md bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center aspect-video">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-md overflow-hidden bg-muted aspect-video">
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

// Component to handle certification slide thumbnail image with error fallback
function CertificationThumbnailImage({
  slideId,
  alt,
}: {
  slideId: string;
  alt: string;
}) {
  const [hasError, setHasError] = useState(false);
  const getSlideUrl = useCertificationSlidesCacheStore(
    (state) => state.getSlideUrl
  );
  const cachedUrl = useCertificationSlidesCacheStore(
    (state) => state.cache[slideId]?.url ?? null
  );
  const loading = useCertificationSlidesCacheStore(
    (state) => state.loading[slideId] ?? false
  );
  const [imageUrl, setImageUrl] = useState<string | null>(cachedUrl);

  // Fetch URL using cache store
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

  // Update when cached URL changes
  useEffect(() => {
    if (cachedUrl && !loading) {
      setImageUrl(cachedUrl);
    }
  }, [cachedUrl, loading]);

  if (loading && !imageUrl) {
    return (
      <div className="w-full rounded-md bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center aspect-video">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasError || !imageUrl) {
    return (
      <div className="w-full rounded-md bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center aspect-video">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-md overflow-hidden bg-muted aspect-video">
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

export function TeacherOverviewSection() {
  const currentUser = useMeStore((s) => s.currentUser);
  const activeSchool = useSchoolStore((s) => s.getActiveSchool());
  const { data: mySchools = [] } = useMySchoolsQuery(
    { limit: 1 },
    { enabled: !activeSchool }
  );

  // Get the school slug - prefer active school from store, otherwise first school from query
  const schoolSlug = activeSchool?.slug || (mySchools[0] as any)?.slug;
  const teacherId = currentUser?.id;

  // Build the lessons link with dialog parameter using slug
  const startNewLessonLink = schoolSlug
    ? `/schools/${schoolSlug}/lessons?dialog=add-new-lesson`
    : "/schools";

  // Build the view lessons link using slug
  const viewLessonsLink = schoolSlug
    ? `/schools/${schoolSlug}/lessons`
    : "/schools";

  // Build the view content link using slug
  const viewContentLink = schoolSlug
    ? `/schools/${schoolSlug}/content`
    : "/schools";

  // Build the classes link using slug
  const classesLink = schoolSlug
    ? `/schools/${schoolSlug}/classes`
    : "/schools";

  // Fetch live lessons (in_progress or pending_review) for the current teacher
  const { data: liveLessons, isLoading: isLoadingLessons } = useQuery({
    queryKey: ["live-lessons", teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      // Fetch both in_progress and pending_review lessons
      const [inProgressResult, pendingReviewResult] = await Promise.all([
        lessonsApi.get.list({
          teacherId,
          status: "in_progress",
          limit: 1,
        }),
        lessonsApi.get.list({
          teacherId,
          status: "pending_review",
          limit: 1,
        }),
      ]);

      // Combine results, prioritizing in_progress over pending_review
      const inProgressLessons = inProgressResult.error
        ? []
        : inProgressResult.data || [];
      const pendingReviewLessons = pendingReviewResult.error
        ? []
        : pendingReviewResult.data || [];

      if (inProgressResult.error) {
        console.error(
          "Failed to fetch in-progress lessons:",
          inProgressResult.error
        );
      }
      if (pendingReviewResult.error) {
        console.error(
          "Failed to fetch pending-review lessons:",
          pendingReviewResult.error
        );
      }

      return [...inProgressLessons, ...pendingReviewLessons];
    },
    enabled: !!teacherId,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Get the first live lesson (prioritizes in_progress if both exist)
  const liveLesson = liveLessons?.[0];

  // Fetch live state for the live lesson
  const { data: liveStateData, isLoading: isLoadingLiveState } = useQuery({
    queryKey: ["lesson-live-state", liveLesson?.id],
    queryFn: async () => {
      if (!liveLesson?.id) return null;
      const result = await lessonsApi.liveState.get.byLessonId(liveLesson.id);
      if (result.error) {
        console.error("Failed to fetch live state:", result.error);
        return null;
      }
      return result.data;
    },
    enabled: !!liveLesson?.id,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch full lesson details to get topic info
  const { data: lessonDetails } = useQuery({
    queryKey: ["lesson-details", liveLesson?.id],
    queryFn: async () => {
      if (!liveLesson?.id) return null;
      const result = await lessonsApi.get.byId(liveLesson.id);
      if (result.error) {
        console.error("Failed to fetch lesson details:", result.error);
        return null;
      }
      return result.data;
    },
    enabled: !!liveLesson?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate slide progress information
  const liveState = liveStateData?.liveState;
  const slides = liveStateData?.slides ?? [];
  const totalSlides = slides.length;
  const currentSlideIndex =
    (liveState as any)?.currentIndex ?? (liveState as any)?.current_index ?? 0;
  const currentSlideNumber = currentSlideIndex + 1; // 1-indexed for display
  const isInProgress =
    totalSlides > 0 &&
    liveState !== null &&
    currentSlideNumber > 1 &&
    currentSlideNumber < totalSlides;
  const currentSlide = slides[currentSlideIndex];

  // Build resume URL using slug - for pending_review, go to feedback page
  const resumeUrl =
    liveLesson?.id && schoolSlug
      ? liveLesson.status === "pending_review"
        ? `/schools/${schoolSlug}/lessons/${liveLesson.id}/feedback`
        : `/schools/${schoolSlug}/lessons/${liveLesson.id}/deliver?dialog=present`
      : null;

  // Determine button text based on lesson status
  const resumeButtonText =
    liveLesson?.status === "pending_review"
      ? "Provide feedback"
      : "Resume lesson";

  // Fetch AP Certification data
  const { data: certificationData } = useQuery({
    queryKey: ["ap-certification-dashboard", teacherId],
    queryFn: async () => {
      // Get the active stage (code "C")
      const stageResult = await certificationApi.stages.byCode("C");
      if (stageResult.error || !stageResult.data) {
        return null;
      }

      const stage = stageResult.data;

      // Get all topics for this stage
      const topicsResult = await certificationApi.topics.byStageCode("C");
      if (topicsResult.error || !topicsResult.data) {
        return {
          stage,
          topics: [],
          progress: [],
          topicSlides: {},
          topicSlideCounts: {},
        };
      }

      const topics = topicsResult.data;

      // Get progress for all topics
      const progressResult = await certificationApi.stages.progress.byCode("C");
      if (progressResult.error || !progressResult.data) {
        return {
          stage,
          topics,
          progress: [],
          topicSlides: {},
          topicSlideCounts: {},
        };
      }

      // Fetch slides for each topic to find first image slide and total slide count
      const topicSlides: Record<string, string | null> = {};
      const topicSlideCounts: Record<string, number> = {};
      await Promise.all(
        topics.map(async (topic) => {
          const slidesResult = await certificationApi.topics.slides.list(
            topic.id
          );
          if (slidesResult.data && slidesResult.data.length > 0) {
            const firstImageSlide = slidesResult.data.find(
              (slide) => slide.kind === "image"
            );
            topicSlides[topic.id] = firstImageSlide?.id || null;
            topicSlideCounts[topic.id] = slidesResult.data.length;
          } else {
            topicSlides[topic.id] = null;
            topicSlideCounts[topic.id] = 0;
          }
        })
      );

      return {
        stage,
        topics,
        progress: progressResult.data.progress || [],
        topicSlides,
        topicSlideCounts,
      };
    },
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate certification progress
  const certificationStage = certificationData?.stage;
  const certificationTopics = certificationData?.topics || [];
  const certificationProgress = certificationData?.progress || [];
  const topicSlides = certificationData?.topicSlides || {};
  const topicSlideCounts = certificationData?.topicSlideCounts || {};
  const totalTopics = certificationTopics.length;

  // Count completed topics (status is "completed", "passed", or "failed")
  const completedProgress = certificationProgress.filter(
    (p) =>
      p.status === "completed" || p.status === "passed" || p.status === "failed"
  );

  const completedTopics = completedProgress.length;

  const progressPercentage =
    totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  // Find the most recently completed topic
  const mostRecentCompletedTopic =
    completedProgress.length > 0
      ? completedProgress.sort((a, b) => {
          const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return dateB - dateA;
        })[0]
      : null;

  // Get the topic and its thumbnail slide ID
  const mostRecentTopic =
    mostRecentCompletedTopic &&
    certificationTopics.find((t) => t.id === mostRecentCompletedTopic.topicId);
  const thumbnailSlideId =
    mostRecentTopic && topicSlides[mostRecentTopic.id]
      ? topicSlides[mostRecentTopic.id]
      : null;

  // Find the last topic with any progress data (sorted by updatedAt)
  const topicsWithProgress = certificationProgress
    .filter((p) => p.updatedAt)
    .sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    });

  const lastTopicProgress =
    topicsWithProgress.length > 0 ? topicsWithProgress[0] : null;
  const lastTopic =
    lastTopicProgress &&
    certificationTopics.find((t) => t.id === lastTopicProgress.topicId);

  // Calculate progress percentage for the last topic
  let lastTopicProgressPercentage = 0;
  if (lastTopicProgress && lastTopic) {
    const totalSlides = topicSlideCounts[lastTopic.id] || 0;
    if (totalSlides > 0 && lastTopicProgress.slideProgress) {
      const slideProgressData = lastTopicProgress.slideProgress as Record<
        string,
        any
      >;
      const slideIds = Object.keys(slideProgressData);
      if (slideIds.length > 0) {
        const completedSlides = slideIds.filter(
          (slideId) =>
            slideProgressData[slideId]?.viewed ||
            slideProgressData[slideId]?.answered
        ).length;
        lastTopicProgressPercentage = Math.round(
          (completedSlides / totalSlides) * 100
        );
      }
    }
  }

  return (
    <div className="space-y-6 grid grid-cols-1 md:grid-cols-2 gap-4 w-full items-stretch">
      <div className="col-span-1 flex gap-4 items-stretch">
        <div className="h-fit flex flex-col items-center justify-center w-full max-w-[30%]">
          <div className="flex-1 flex flex-col gap-2 w-full justify-center ">
            <QuickActionsCard
              title="View Lessons"
              icon={<Book className="w-4 h-4" />}
              link={viewLessonsLink}
            />
            <QuickActionsCard
              title="My Classes"
              icon={<Users className="w-4 h-4" />}
              link={classesLink}
            />
            <QuickActionsCard
              title="View Content"
              icon={<GraduationCap className="w-4 h-4" />}
              link={viewContentLink}
            />
            <QuickActionsCard
              title="My Performance"
              icon={<FileText className="w-4 h-4" />}
              link="/schools"
              disabled={true}
            />
            <QuickActionsCard
              disabled
              title="View Reports"
              icon={<FileText className="w-4 h-4" />}
              link="/schools/reports"
            />
          </div>
        </div>
        <div className="h-full flex items-center justify-center py-12">
          <Separator orientation="vertical" className="h-full w-fit mx-4" />
        </div>

        {/* Two cards stacked vertically */}
        <div className="flex-1 w-full flex flex-col gap-4 h-full">
          {/* Start New Lesson Card - Compact */}
          <Link href={startNewLessonLink} className="block w-full">
            <Card
              className="w-full hover:shadow-md transition-shadow cursor-pointer"
              style={{ backgroundColor: "#057f92" }}
            >
              <CardContent className="flex items-center justify-center gap-2 py-0">
                <Play className="h-5 w-5 text-white" />
                <span className="font-medium text-white">
                  Start a new lesson
                </span>
              </CardContent>
            </Card>
          </Link>

          {/* Live Lesson Card - Fills remaining height */}
          {isLoadingLessons || isLoadingLiveState ? (
            <Card className="flex-1 flex flex-col justify-center items-center p-6 min-h-0">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Loading...</p>
            </Card>
          ) : liveLesson && lessonDetails && resumeUrl ? (
            <Link href={resumeUrl} className="block flex-1 min-h-0">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col border-orange-500/30 overflow-hidden bg-orange-500/20 py-0 gap-0">
                <CardHeader className="bg-orange-500/25 p-0 px-4 pt-4 pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-white font-medium">
                    <div className="flex items-center gap-2">
                      <TvMinimalPlay className="h-4 w-4 text-white" />
                      {resumeButtonText}
                    </div>
                    {liveLesson.createdAt && (
                      <span className="text-sm text-white/90 font-normal">
                        {new Date(liveLesson.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            // year: "numeric",
                          }
                        )}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>

                {/* Thumbnail Preview - Full width, no horizontal padding */}
                {!isLoadingLiveState &&
                  liveState !== null &&
                  currentSlide &&
                  currentSlide.kind === "image" && (
                    <div className="w-full px-4 pt-4">
                      <ThumbnailImage
                        slideId={currentSlide.topicSlideId}
                        alt={`Slide ${currentSlideNumber} preview`}
                      />
                    </div>
                  )}

                <CardContent className="flex-1 flex flex-col p-6">
                  <div className="space-y-4 flex-1 flex flex-col min-h-0">
                    {/* Topic title and slide number row */}
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-lg font-medium truncate flex-[2]">
                        {lessonDetails.topic?.title || "No topic assigned"}
                      </p>
                      {!isLoadingLiveState && liveState !== null && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0 cursor-help">
                              <FileText className="h-4 w-4" />
                              <span>{currentSlideNumber}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            Slide {currentSlideNumber} of {totalSlides}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>

                    {/* Classes display */}
                    {lessonDetails.assignedClasses &&
                      lessonDetails.assignedClasses.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {lessonDetails.assignedClasses.map(
                            (assignedClass) => (
                              <Badge
                                key={assignedClass.classId}
                                variant="outline"
                                className="text-xs"
                              >
                                {assignedClass.className}
                              </Badge>
                            )
                          )}
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card className="flex-1 flex flex-col justify-center items-center p-6 min-h-0 border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center h-full">
                <BookOpen className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground text-center">
                  No active lesson
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-4 w-full h-full">
        {/* AP Certification Card - Full Width, Fills Remaining Height */}
        <StaggeredAnimation index={0} className="flex-1 min-h-0">
          <Link href="/ap-certification" className="block h-full">
            <Card className="hover:shadow-md transition-shadow w-full h-full flex flex-col relative group cursor-pointer">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground flex flex-row justify-between items-center">
                  <div className="flex items-center gap-1">
                    <BadgeCheck className="h-3 w-3" />
                    <h2 className="text-sm font-medium text-muted-foreground">
                      AP Certification
                    </h2>
                  </div>
                  {certificationStage && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground text-right">
                        {certificationStage.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {completedTopics}/{totalTopics}
                      </span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 flex-1">
                {certificationStage ? (
                  <>
                    {/* Thumbnail on left, topic info on right */}
                    <div className="flex gap-4 flex-1">
                      {/* Thumbnail - Half width on the left */}
                      {thumbnailSlideId && (
                        <div className="w-1/3 flex-shrink-0">
                          <CertificationThumbnailImage
                            slideId={thumbnailSlideId}
                            alt={
                              mostRecentTopic?.title ||
                              "Most recently completed topic"
                            }
                          />
                        </div>
                      )}
                      {/* Topic information on the right */}
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="space-y-2">
                          {lastTopic && lastTopicProgress && (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-2xl font-bold">
                                  {lastTopic.title}
                                </span>
                              </div>
                              {/* Progress bar underneath topic title */}
                              <div className="space-y-1 pt-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>Progress</span>
                                  <span>{lastTopicProgressPercentage}%</span>
                                </div>
                                <Progress
                                  value={lastTopicProgressPercentage}
                                  className="h-2"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Under construction
                    </p>
                    <Progress value={0} className="h-2" />
                  </>
                )}
              </CardContent>
            </Card>
          </Link>
        </StaggeredAnimation>
      </div>
    </div>
  );
}
