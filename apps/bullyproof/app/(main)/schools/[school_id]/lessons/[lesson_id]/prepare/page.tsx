"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Calendar } from "@workspace/ui/components/calendar";
import { Loader2, ChevronLeft, ChevronRight, ChevronDown, CheckCircle2, FileText, AlertCircle, HandMetal, ChevronsRight, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { toast } from "sonner";
import { useLessonById } from "@/entities/lessons/api/useLessonById";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { useMeStore } from "@/entities/me/model/store";
import { TakeOverLessonDialog } from "@/components/molecules/take-over-lesson-dialog";
import { lessonsKeys } from "@/entities/lessons/model/keys";
import { topicsApi } from "@/entities/topics/api/endpoints";
import { getAuthHeaders } from "@/lib/api/fetcher.client";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Image from "next/image";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  SlideRenderer,
  type SlideData,
} from "@/components/organisms/slide-renderer";
import type { topics } from "@/server/db/schema";

type Topic = typeof topics.$inferSelect & { slides?: any[] };

export default function LessonPreparePage() {
  usePageTitle(["schools", "lessons", "prepare"]);
  const params = useParams();
  const router = useRouter();
  const lesson_id = params?.lesson_id as string;
  const school_id = params?.school_id as string;
  const queryClient = useQueryClient();

  // Schedule dialog state
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showConfirmOverwrite, setShowConfirmOverwrite] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState("09:00"); // Default to 9 AM local time
  const [isScheduling, setIsScheduling] = useState(false);
  const [pendingSchedule, setPendingSchedule] = useState<{ date: Date; time: string } | null>(null);

  // Check if the selected schedule time is in the past
  const isScheduleTimeInPast = (() => {
    if (!scheduleDate) return false;
    const [hours, minutes] = scheduleTime.split(":").map(Number);
    const scheduledDateTime = new Date(scheduleDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);
    return scheduledDateTime < new Date();
  })();

  const {
    data: lessonData,
    isLoading: lessonLoading,
    isError: lessonError,
    error: lessonErrorData,
  } = useLessonById(lesson_id);
  const currentUser = useMeStore((s) => s.currentUser);
  const isLessonCreator = currentUser?.id === lessonData?.createdByUserId;
  const takeOverableStatuses = ["preparing", "ready", "in_progress"];
  const canShowTakeOver =
    !isLessonCreator &&
    lessonData?.status &&
    takeOverableStatuses.includes(lessonData.status);
  const isFeedbackOrCompleted =
    lessonData?.status === "feedback" || lessonData?.status === "completed";

  const [showTakeOverDialog, setShowTakeOverDialog] = useState(false);
  const [isTakingOver, setIsTakingOver] = useState(false);

  // Checklist state - initialize based on lesson status
  const isAlreadyReady = lessonData?.status === "ready" || 
    lessonData?.status === "in_progress" || 
    lessonData?.status === "feedback" || 
    lessonData?.status === "completed";
  const [viewedSlides, setViewedSlides] = useState(false);
  const [downloadedPlan, setDownloadedPlan] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  // Initialize checklist state when lesson data loads
  useEffect(() => {
    if (isAlreadyReady) {
      setViewedSlides(true);
      setDownloadedPlan(true);
    }
  }, [isAlreadyReady]);

  const [showPreview, setShowPreview] = useState(false);
  const [showGalleryDrawer, setShowGalleryDrawer] = useState(false);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [isLoadingTopic, setIsLoadingTopic] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);

  // Lesson plans for PDF download
  type LessonPlan = {
    id: string;
    topicId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number | null;
    uploadedBy: string | null;
    createdAt: string;
  };
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [isLoadingLessonPlans, setIsLoadingLessonPlans] = useState(false);
  const [lessonPlansError, setLessonPlansError] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const galleryRef = useRef<HTMLDivElement>(null);
  const slideGalleryRef = useRef<HTMLDivElement | null>(null);
  const wheelHandlerRef = useRef<((e: WheelEvent) => void) | null>(null);

  const fetchTopicData = useCallback(async () => {
    if (!lessonData?.topicId) return;

    try {
      setIsLoadingTopic(true);
      setTopicError(null);

      const topicResult = await topicsApi.get.byId(lessonData.topicId, {
        includeSlides: true,
        includeUrls: true,
      });
      if (topicResult.data) {
        setTopic(topicResult.data);
        const initialSlides =
          topicResult.data.slides
            ?.sort((a, b) => a.orderIndex - b.orderIndex)
            .map((slide) => ({
              id: slide.id,
              kind: slide.kind as "text" | "image" | "video",
              orderIndex: slide.orderIndex,
              textHtml: slide.textHtml ?? null,
              imageUrl: slide.imageUrl ?? null,
              videoUrl: slide.videoUrl ?? null,
              videoStartS: slide.videoStartS ?? null,
              videoEndS: slide.videoEndS ?? null,
              signedUrl: (slide as { signedUrl?: string }).signedUrl ?? null,
              signedImageUrl: (slide as { signedImageUrl?: string }).signedImageUrl ?? null,
              signedVideoUrl: (slide as { signedVideoUrl?: string }).signedVideoUrl ?? null,
            })) ?? [];
        setSlides(initialSlides);
        setCurrentSlideIndex(0);
      } else {
        setTopicError(
          topicResult.error?.message ?? "Failed to fetch topic details"
        );
      }
    } catch (err) {
      console.error("Failed to fetch topic:", err);
      setTopicError(
        err instanceof Error ? err.message : "Failed to fetch topic details"
      );
    } finally {
      setIsLoadingTopic(false);
    }
  }, [lessonData?.topicId]);

  // Fetch slides when lesson data loads (for thumbnail preview)
  useEffect(() => {
    if (lessonData?.topicId) {
      fetchTopicData();
    }
  }, [lessonData?.topicId, fetchTopicData]);

  // Fetch lesson plans when lesson data loads
  const fetchLessonPlans = useCallback(async () => {
    if (!lessonData?.topicId) return;
    try {
      setIsLoadingLessonPlans(true);
      setLessonPlansError(null);
      const result = await topicsApi.lessonPlans.list(lessonData.topicId);
      if (result.data) {
        setLessonPlans(result.data);
      } else {
        setLessonPlansError(result.error?.message ?? "Failed to load lesson plans");
      }
    } catch (err) {
      console.error("Failed to fetch lesson plans:", err);
      setLessonPlansError(err instanceof Error ? err.message : "Failed to load lesson plans");
    } finally {
      setIsLoadingLessonPlans(false);
    }
  }, [lessonData?.topicId]);

  useEffect(() => {
    if (lessonData?.topicId) {
      fetchLessonPlans();
    } else {
      setLessonPlans([]);
      setLessonPlansError(null);
    }
  }, [lessonData?.topicId, fetchLessonPlans]);

  const handleLessonPlanDownload = async (planId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/topic-lesson-plans/${planId}/download`, {
        headers,
      });
      if (!res.ok) {
        toast.error("Failed to download lesson plan");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition");
      const match = disposition?.match(/filename="?([^";\n]+)"?/);
      const filename = match?.[1] ?? "lesson-plan.pdf";
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      setDownloadedPlan(true);
    } catch (err) {
      toast.error("Failed to download lesson plan", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  // Scroll gallery to show current slide (horizontal strip)
  useEffect(() => {
    if (galleryRef.current && slides.length > 0) {
      const slideElement = galleryRef.current.children[
        currentSlideIndex
      ] as HTMLElement;
      if (slideElement) {
        slideElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }
    }
  }, [currentSlideIndex, slides.length]);

  // Wheel handler: convert vertical scroll to horizontal in slide gallery
  const setSlideGalleryRef = useCallback((element: HTMLDivElement | null) => {
    if (slideGalleryRef.current && wheelHandlerRef.current) {
      slideGalleryRef.current.removeEventListener("wheel", wheelHandlerRef.current);
    }
    slideGalleryRef.current = element;
    if (!element) {
      wheelHandlerRef.current = null;
      return;
    }
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      element.scrollLeft += e.deltaY;
    };
    wheelHandlerRef.current = handleWheel;
    element.addEventListener("wheel", handleWheel, { passive: false });
  }, []);

  useEffect(() => {
    return () => {
      if (slideGalleryRef.current && wheelHandlerRef.current) {
        slideGalleryRef.current.removeEventListener("wheel", wheelHandlerRef.current);
      }
    };
  }, []);

  // Auto-update lesson status to 'ready' when both checklist items are checked
  // Note: isUpdatingStatus intentionally excluded from deps - it's a guard to prevent
  // concurrent updates. Including it would cause the effect to re-run when it flips
  // to false, potentially before the refetch completes, triggering duplicate PUTs.
  useEffect(() => {
    const updateStatusToReady = async () => {
      if (
        viewedSlides &&
        downloadedPlan &&
        lessonData?.status === "preparing" &&
        !isUpdatingStatus
      ) {
        setIsUpdatingStatus(true);
        try {
          await lessonsApi.put.update(lesson_id, { status: "ready" });
          // Invalidate using the correct query key so lessonData refreshes
          queryClient.invalidateQueries({ queryKey: lessonsKeys.detail(lesson_id) });
        } catch (error) {
          console.error("Failed to update lesson status:", error);
        } finally {
          setIsUpdatingStatus(false);
        }
      }
    };

    updateStatusToReady();
  }, [viewedSlides, downloadedPlan, lessonData?.status, lesson_id, queryClient]);

  // Open schedule dialog with pre-populated values if lesson already has a schedule
  const openScheduleDialog = () => {
    if (lessonData?.scheduledFor) {
      const existingDate = new Date(lessonData.scheduledFor);
      setScheduleDate(existingDate);
      // Format time as HH:mm for the time input
      const hours = existingDate.getHours().toString().padStart(2, "0");
      const minutes = existingDate.getMinutes().toString().padStart(2, "0");
      setScheduleTime(`${hours}:${minutes}`);
    } else {
      setScheduleDate(undefined);
      setScheduleTime("09:00");
    }
    setShowScheduleDialog(true);
  };

  // Handle scheduling the lesson
  const handleScheduleLesson = async () => {
    if (!scheduleDate) return;
    
    // Combine date and time (time is in user's local timezone)
    const [hours, minutes] = scheduleTime.split(":").map(Number);
    const scheduledDateTime = new Date(scheduleDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);
    
    // If there's an existing schedule, show confirmation dialog
    if (lessonData?.scheduledFor) {
      setPendingSchedule({ date: scheduledDateTime, time: scheduleTime });
      setShowConfirmOverwrite(true);
      return;
    }
    
    // No existing schedule, proceed directly
    await saveSchedule(scheduledDateTime);
  };

  // Actually save the schedule (called directly or after confirmation)
  const saveSchedule = async (scheduledDateTime: Date) => {
    setIsScheduling(true);
    try {
      await lessonsApi.put.update(lesson_id, { 
        scheduledFor: scheduledDateTime.toISOString() 
      });
      queryClient.invalidateQueries({ queryKey: lessonsKeys.detail(lesson_id) });
      setShowScheduleDialog(false);
      setShowConfirmOverwrite(false);
      setPendingSchedule(null);
      setScheduleDate(undefined);
      setScheduleTime("09:00");
    } catch (error) {
      console.error("Failed to schedule lesson:", error);
    } finally {
      setIsScheduling(false);
    }
  };

  // Handle confirmation of overwrite
  const handleConfirmOverwrite = async () => {
    if (!pendingSchedule) return;
    await saveSchedule(pendingSchedule.date);
  };

  // Cancel overwrite confirmation
  const handleCancelOverwrite = () => {
    setShowConfirmOverwrite(false);
    setPendingSchedule(null);
  };

  // Navigate to run lesson page with presentation dialog open
  const handleRunLesson = () => {
    router.push(`/schools/${school_id}/lessons/${lesson_id}/run-lesson?dialog=present`);
  };

  // Skip checklist and mark lesson ready, then navigate to run lesson
  const handleSkipToReady = async () => {
    setIsSkipping(true);
    try {
      await lessonsApi.put.update(lesson_id, { status: "ready" });
      queryClient.invalidateQueries({ queryKey: lessonsKeys.detail(lesson_id) });
      router.push(`/schools/${school_id}/lessons/${lesson_id}/run-lesson?dialog=present`);
    } catch (error) {
      console.error("Failed to mark lesson ready:", error);
      toast.error("Failed to mark lesson ready", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSkipping(false);
    }
  };

  const currentSlide = slides[currentSlideIndex];
  const canGoPrev = currentSlideIndex > 0;
  const canGoNext = currentSlideIndex < slides.length - 1;

  const goToPrevious = () => {
    if (canGoPrev) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const goToNext = () => {
    if (canGoNext) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  if (lessonLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading lesson details...</p>
        </div>
      </div>
    );
  }

  if (lessonError || !lessonData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive font-medium">
            {lessonErrorData?.message || "Failed to load lesson details"}
          </p>
          <p className="text-muted-foreground mt-2">
            {lessonErrorData?.message?.includes("Unauthorized")
              ? "You don't have permission to view this lesson"
              : "Please try again later"}
          </p>
        </div>
      </div>
    );
  }

  // Non-owner: show Take Over CTA or feedback message
  if (!isLessonCreator) {
    const handleTakeOver = async () => {
      setIsTakingOver(true);
      try {
        const result = await lessonsApi.post.takeOver(lesson_id);
        if (result.error) {
          throw new Error(result.error.message ?? "Failed to take over lesson");
        }
        queryClient.invalidateQueries({ queryKey: lessonsKeys.detail(lesson_id) });
        toast.success("You have taken over this lesson");
        setShowTakeOverDialog(false);
      } catch (err) {
        toast.error("Failed to take over lesson", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setIsTakingOver(false);
      }
    };
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Prepare Lesson</h1>
          <p className="text-muted-foreground">
            {canShowTakeOver
              ? "You need to take over this lesson to prepare it."
              : isFeedbackOrCompleted
                ? "Only the lesson owner can complete feedback."
                : "You don't have permission to prepare this lesson."}
          </p>
        </div>
        {canShowTakeOver && (
          <Card>
            <CardContent className="pt-6 flex flex-col items-center gap-4">
              <p className="text-muted-foreground text-center">
                Take over this lesson to view the checklist and prepare for delivery.
              </p>
              <Button onClick={() => setShowTakeOverDialog(true)}>
                <HandMetal className="h-4 w-4 mr-2" />
                Take Over Lesson
              </Button>
            </CardContent>
          </Card>
        )}
        <TakeOverLessonDialog
          open={showTakeOverDialog}
          onOpenChange={setShowTakeOverDialog}
          lesson={{
            id: lesson_id,
            assignedClasses: lessonData.assignedClasses,
            teacher: lessonData.teacher,
            createdByUserId: lessonData.createdByUserId,
          }}
          onConfirm={handleTakeOver}
          isTakingOver={isTakingOver}
        />
      </div>
    );
  }

  return (
      <div className="space-y-6">
      {/* Header */}
      <div>
      <h1 className="text-3xl font-bold">Prepare Lesson</h1>
      <p className="text-muted-foreground">
        Review the checklist and prepare for delivery.
      </p>
      </div>
      <div className="space-y-4">
          <div className="space-y-4">
            {/* Step 1: View slides card */}
            <Card
              className={`overflow-hidden transition-all ${slides.length > 0 ? "cursor-pointer hover:shadow-md" : "opacity-75"}`}
              onClick={() => slides.length > 0 && setShowPreview(true)}
            >
              <div className="flex items-center gap-4 px-4 py-3">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                  {viewedSlides ? (
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  ) : (
                    <div className="w-10 h-10 rounded-full border-2 border-muted-foreground" />
                  )}
                </div>
                <div className="flex-shrink-0 w-32 aspect-video rounded overflow-hidden bg-muted">
                  {isLoadingTopic ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : slides[0] ? (
                    <SlideRenderer
                      slide={slides[0]}
                      className="w-full h-full"
                      thumbnailOnly={true}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">No slides</span>
                    </div>
                  )}
                </div>
                <p className="font-medium">
                  View {slides.length} lesson slide{slides.length !== 1 ? "s" : ""}
                </p>
              </div>
            </Card>

            {/* Step 2: Lesson plan card */}
            <Card
              className={`overflow-hidden transition-all ${lessonPlans.length > 0 ? "cursor-pointer hover:shadow-md" : "opacity-75"}`}
              onClick={() => {
                if (lessonPlans.length > 0) {
                  handleLessonPlanDownload(lessonPlans[0].id);
                  setDownloadedPlan(true);
                }
              }}
            >
              <div className="flex items-center gap-4 px-4">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                  {downloadedPlan ? (
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  ) : (
                    <div className="w-10 h-10 rounded-full border-2 border-muted-foreground" />
                  )}
                </div>
                <div className="flex-shrink-0 w-32 flex items-center justify-center border aspect-video rounded-lg bg-muted">
                  {isLoadingLessonPlans ? (
                    <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="flex items-center gap-2">
                    <Image
                      src="/images/bp-small-logo.svg"
                      alt="Lesson plan"
                      width={128}
                      height={128}
                      className="object-contain w-9 h-9"
                    />
                
                    <FileText className="h-10 w-10 text-[var(--brand-bullyproof-primary)]" />
                    </div>
                  )}
                </div>
                {isLoadingLessonPlans ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : lessonPlans.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No lesson plan available</p>
                ) : (
                  <button
                    type="button"
                    className="font-medium text-blue-600 underline hover:text-blue-700 hover:underline cursor-pointer dark:text-blue-500 dark:hover:text-blue-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (lessonPlans.length > 0) {
                        handleLessonPlanDownload(lessonPlans[0].id);
                        setDownloadedPlan(true);
                      }
                    }}
                  >
                    Download the lesson plan
                  </button>
                )}
              </div>
            </Card>
          </div>

          {/* Skip button - not a step */}
          {!isAlreadyReady && (
            <div className="mt-4">
              <Button
                size="lg"
                onClick={handleSkipToReady}
                disabled={isSkipping}
                className="flex items-center gap-3 bg-[var(--brand-bullyproof-primary)] text-secondary hover:bg-[var(--brand-bullyproof-primary)]/90 w-full sm:w-auto sm:min-w-[260px] text-base font-medium"
              >
                {isSkipping ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ChevronsRight className="h-5 w-5" />
                )}
                {isSkipping ? "Marking ready..." : "Skip, I'm ready to run now"}
              </Button>
            </div>
          )}

          {isUpdatingStatus && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating lesson status...
            </div>
          )}

          {/* Next button - show when checklist complete */}
          {isAlreadyReady && !isUpdatingStatus && (
            <div className="mt-6 pt-4 border-t">
              <Button
                size="lg"
                onClick={handleRunLesson}
                className="flex items-center gap-3 bg-[var(--brand-bullyproof-primary)] text-secondary hover:bg-[var(--brand-bullyproof-primary)]/90 text-base font-medium"
              >
                Next
                <ChevronsRight className="h-5 w-5 animate-bounce-right" />
              </Button>
            </div>
          )}
        </div>
      

      {/* Slide Preview Dialog */}
      <Dialog
        open={showPreview}
        onOpenChange={(open) => {
          setShowPreview(open);
          if (!open) {
            setViewedSlides(true);
            setShowGalleryDrawer(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center gap-3 cursor-help">
          
                  <DialogTitle className="text-3xl font-bold uppercase tracking-wider text-muted-foreground md:text-4xl">
                    Preview Only
                  </DialogTitle>
               
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm text-center">
                Do not use this mode to present to the class
              </TooltipContent>
            </Tooltip>
            <DialogDescription className="sr-only">
              Preview only. Do not use this mode to present to the class.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-6">
            {isLoadingTopic ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading slides...</p>
              </div>
            ) : topicError ? (
              <div className="text-center text-destructive py-8">
                <p className="font-medium">Error loading slides</p>
                <p className="text-sm text-muted-foreground mt-2">{topicError}</p>
              </div>
            ) : slides.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="font-medium">No slides available</p>
                <p className="text-sm mt-2">This lesson doesn&apos;t have any slides yet.</p>
              </div>
            ) : currentSlide ? (
              <div className="flex flex-col gap-4 min-h-0">
                <div className="relative w-full aspect-video flex-shrink-0">
                  <SlideRenderer
                    key={currentSlide.id}
                    slide={currentSlide}
                    className="w-full h-full"
                  />
                </div>
                {slides.length > 1 && (
                  <div className="flex items-center justify-center gap-4 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToPrevious();
                      }}
                      disabled={!canGoPrev}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowGalleryDrawer(true);
                      }}
                      className="flex w-fit items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <span>
                        Slide {currentSlideIndex + 1} of {slides.length}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToNext();
                      }}
                      disabled={!canGoNext}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Slide gallery drawer - from bottom */}
      <Drawer open={showGalleryDrawer} onOpenChange={setShowGalleryDrawer}>
        <DrawerContent className="z-[100] !left-1/2 !right-auto -translate-x-1/2 w-full max-w-[75rem] max-h-[50vh] rounded-t-xl border-x border-t shadow-lg data-[vaul-drawer-direction=bottom]:!left-1/2 data-[vaul-drawer-direction=bottom]:!right-auto">
          <DrawerHeader>
            <DrawerTitle>Jump to slide</DrawerTitle>
          </DrawerHeader>
          <div
            ref={(el) => {
              galleryRef.current = el;
              setSlideGalleryRef(el);
            }}
            className="flex gap-4 overflow-x-auto overflow-y-visible py-3 px-4 pb-6 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
          >
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => {
                  setCurrentSlideIndex(index);
                  setShowGalleryDrawer(false);
                }}
                className={`
                  flex-shrink-0 relative rounded-lg overflow-hidden shadow-lg bg-background cursor-pointer w-[180px]
                  ${
                    index === currentSlideIndex
                      ? "ring-2 ring-primary ring-offset-2"
                      : "opacity-70 hover:opacity-100"
                  }
                `}
                style={{ aspectRatio: "16 / 9" }}
              >
                <div className="w-full h-full relative">
                  <SlideRenderer
                    slide={slide}
                    className="w-full h-full"
                    thumbnailOnly={true}
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 text-center text-xs font-medium py-1 px-2 bg-background/80 text-foreground">
                  Slide {slide.orderIndex + 1}
                </div>
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Schedule Lesson Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {lessonData?.scheduledFor ? "Reschedule Lesson" : "Schedule Lesson"}
            </DialogTitle>
            <DialogDescription>
              {lessonData?.scheduledFor 
                ? "This lesson is currently scheduled. You can change the date and time below."
                : "Choose a date and time to schedule this lesson for delivery."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex flex-row gap-6">
            {/* Calendar on the left */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Date</Label>
              <Calendar
                mode="single"
                selected={scheduleDate}
                onSelect={setScheduleDate}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today;
                }}
                initialFocus
                className="rounded-lg border"
              />
            </div>
            
            {/* Time Picker on the right */}
            <div className="flex flex-col justify-between flex-1">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="schedule-time" className="text-sm font-medium">
                    Time
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    Your local timezone
                  </span>
                </div>
                <Input
                  id="schedule-time"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full rounded-lg"
                />
                {isScheduleTimeInPast && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This time has already passed
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              {/* Summary Card */}
              <Card className="bg-muted/50 py-0">
                <CardContent className="p-4 space-y-3">
                  {/* Lesson Details */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Lesson</p>
                    <p className="text-sm font-medium">
                      {lessonData?.topic?.title || "Untitled Lesson"}
                    </p>
                    {lessonData?.assignedClasses && lessonData.assignedClasses.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {lessonData.assignedClasses.map((c: any) => c.className).join(", ")}
                      </p>
                    )}
                  </div>
                  
                  {/* Schedule Details */}
                  {scheduleDate && (
                    <div className="pt-2 border-t">
                      {/* <p className="text-xs text-muted-foreground mb-1">Scheduled for</p> */}
                      <p className="text-sm font-medium">
                        {scheduleDate.toLocaleDateString(undefined, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        at {new Date(`2000-01-01T${scheduleTime}`).toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowScheduleDialog(false);
                setScheduleDate(undefined);
                setScheduleTime("09:00");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleLesson}
              disabled={!scheduleDate || isScheduling || isScheduleTimeInPast}
            >
              {isScheduling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : lessonData?.scheduledFor ? (
                "Update Schedule"
              ) : (
                "Schedule"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Overwrite Dialog */}
      <AlertDialog open={showConfirmOverwrite} onOpenChange={setShowConfirmOverwrite}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Scheduled Time?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>You're about to change the scheduled time for this lesson.</p>
                
                <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Current schedule</p>
                    <p className="text-sm font-medium text-foreground">
                      {lessonData?.scheduledFor && new Date(lessonData.scheduledFor).toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      at {lessonData?.scheduledFor && new Date(lessonData.scheduledFor).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </p>
                  </div>
                  
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground mb-1">New schedule</p>
                    <p className="text-sm font-medium text-foreground">
                      {pendingSchedule?.date.toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      at {pendingSchedule?.date.toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </p>
                  </div>
                </div>
                
                <p>Are you sure you want to update the schedule?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelOverwrite} disabled={isScheduling}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOverwrite} disabled={isScheduling}>
              {isScheduling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Yes, Update Schedule"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
