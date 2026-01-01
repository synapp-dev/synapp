"use client";

import { SnapshotCardWithData } from "@/entities/dashboard/ui/admin/cards/snapshot-card-with-data";
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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@workspace/ui/components/tooltip";

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

  return (
    <div className="space-y-6 grid grid-cols-1 md:grid-cols-2 gap-4 w-full items-stretch">
      <div className="col-span-1 flex gap-4 items-stretch">
        <div className="h-fit flex flex-col items-center justify-center w-full max-w-[30%]">
          <div className="flex-1 flex flex-col gap-2 w-full justify-center ">
            <QuickActionsCard
              title="View Lessons"
              icon={<Book className="w-4 h-4" />}
              link="/schools"
            />
            <QuickActionsCard
              title="My Classes"
              icon={<Users className="w-4 h-4" />}
              link="/schools"
            />
            <QuickActionsCard
              title="View Content"
              icon={<GraduationCap className="w-4 h-4" />}
              link="/schools"
            />
            <QuickActionsCard
              title="My Performance"
              icon={<FileText className="w-4 h-4" />}
              link="/schools"
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
            <Card className="flex-1 flex flex-col justify-center items-center p-6 min-h-0">
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
          <Card className="hover:shadow-md transition-shadow w-full h-full flex flex-col relative group">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground flex flex-row justify-between">
                <div className="flex items-center gap-1">
                  <BadgeCheck className="h-3 w-3" />
                  <h2 className="text-sm font-medium text-muted-foreground">
                    AP Certification
                  </h2>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>
        </StaggeredAnimation>

        {/* Bottom row with two cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {/* Completed Lessons Card */}
          <StaggeredAnimation index={1}>
            <SnapshotCardWithData
              metricKey="lessons/completed"
              title="Completed Lessons"
              icon="BookOpen"
              subtitle="Lessons completed this term"
              scope="school"
            />
          </StaggeredAnimation>

          {/* Engagement Rate Card */}
          <StaggeredAnimation index={2}>
            <SnapshotCardWithData
              metricKey="lessons/engagement-rate"
              title="Engagement Rate"
              icon="Activity"
              subtitle="Activity in last 30 days"
              scope="school"
            />
          </StaggeredAnimation>
        </div>
      </div>
    </div>
  );
}
