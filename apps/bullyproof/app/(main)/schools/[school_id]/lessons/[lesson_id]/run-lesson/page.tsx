"use client";

import { useState, use, useEffect } from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Presentation, Loader2, CalendarIcon, Clock, AlertCircle, HandMetal, ArrowLeft, ChevronsLeft, ChevronsUp, HelpCircle, SquareArrowOutUpRight } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useLessonById } from "@/entities/lessons/api/useLessonById";
import { useMeStore } from "@/entities/me/model/store";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { lessonsKeys } from "@/entities/lessons/model/keys";
import { TakeOverLessonDialog } from "@/components/molecules/take-over-lesson-dialog";
import { useFeaturesAccess } from "@/hooks/use-features-access";
import { ACTION_FEATURES } from "@/lib/feature-keys";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Separator } from "@workspace/ui/components/separator";
import { compareSlidesByPosition } from "@/lib/fractional-position";
import { SlideRenderer, type SlideData } from "@/components/organisms/slide-renderer";
import {
  getDefaultPagePath,
  getLessonDetailRefreshKeys,
  resolveRunLessonStatusRedirect,
} from "@/lib/lesson-lifecycle";

// Live countdown component for scheduled lessons
function LiveCountdown({ scheduledFor }: { scheduledFor: string }) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const now = new Date();
    const eventTime = new Date(scheduledFor);
    return Math.floor((eventTime.getTime() - now.getTime()) / 1000);
  });

  useEffect(() => {
    const eventTime = new Date(scheduledFor);
    
    const updateTime = () => {
      const now = new Date();
      const diff = Math.floor((eventTime.getTime() - now.getTime()) / 1000);
      setTimeLeft(diff);
    };

    updateTime();

    // If under an hour, update every second; otherwise update every minute
    const intervalMs = timeLeft < 3600 ? 1000 : 60000;
    const interval = setInterval(updateTime, intervalMs);

    return () => clearInterval(interval);
  }, [scheduledFor, timeLeft < 3600]);

  // Format based on time remaining
  if (timeLeft <= 0) {
    return <span className="font-medium">now</span>;
  } else if (timeLeft < 60) {
    return <span className="font-medium tabular-nums">{timeLeft} seconds</span>;
  } else if (timeLeft < 3600) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return (
      <span className="font-medium tabular-nums">
        {minutes}m {seconds.toString().padStart(2, "0")}s
      </span>
    );
  } else if (timeLeft < 86400) {
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    return <span className="font-medium">{hours}h {minutes}m</span>;
  } else if (timeLeft < 604800) {
    const days = Math.floor(timeLeft / 86400);
    const hours = Math.floor((timeLeft % 86400) / 3600);
    return <span className="font-medium">{days}d {hours}h</span>;
  } else {
    const weeks = Math.floor(timeLeft / 604800);
    return <span className="font-medium">{weeks} week{weeks !== 1 ? "s" : ""}</span>;
  }
}

export default function LessonRunLessonPage({
  params,
}: {
  params: Promise<{ school_id: string; lesson_id: string }>;
}) {
  usePageTitle(["schools", "lessons", "run-lesson"]);
  const { school_id, lesson_id } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [presentDialogOpen, setPresentDialogOpen] = useState(false);
  const [presentHelpOpen, setPresentHelpOpen] = useState(false);

  // Schedule dialog state
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showConfirmOverwrite, setShowConfirmOverwrite] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [isScheduling, setIsScheduling] = useState(false);
  const [pendingSchedule, setPendingSchedule] = useState<{ date: Date; time: string } | null>(null);
  const [showTakeOverDialog, setShowTakeOverDialog] = useState(false);
  const [isTakingOver, setIsTakingOver] = useState(false);

  // Check if user is the lesson creator
  const { data: lessonData, isLoading: isLoadingLesson } = useLessonById(lesson_id);
  const currentUser = useMeStore((s) => s.currentUser);
  const isLessonCreator = currentUser?.id === lessonData?.createdByUserId;

  // Check if lesson is scheduled for the future
  const isScheduledForFuture = lessonData?.scheduledFor 
    ? new Date(lessonData.scheduledFor) > new Date() 
    : false;
  const isOverdue = lessonData?.scheduledFor 
    ? new Date(lessonData.scheduledFor) <= new Date() 
    : false;

  // Check if the selected schedule time is in the past
  const isScheduleTimeInPast = (() => {
    if (!scheduleDate) return false;
    const [hours, minutes] = scheduleTime.split(":").map(Number);
    const scheduledDateTime = new Date(scheduleDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);
    return scheduledDateTime < new Date();
  })();

  const takeOverableStatuses = ["preparing", "ready", "in_progress"];
  const takeOverFeatureAccess = useFeaturesAccess(
    [ACTION_FEATURES.TAKE_OVER_LESSON],
    lessonData?.schoolId
  );
  const hasTakeOverFeature =
    takeOverFeatureAccess[ACTION_FEATURES.TAKE_OVER_LESSON]?.hasAccess ?? false;
  const canShowTakeOver =
    !isLessonCreator &&
    !!lessonData?.status &&
    takeOverableStatuses.includes(lessonData.status) &&
    hasTakeOverFeature;

  // Fetch live state when lesson is ready or in progress (for "Continue from slide X" label and dialog preview)
  const { data: liveStateData, isLoading: isSlideLoading } = useQuery({
    queryKey: ["lesson", lesson_id, "live-state"],
    queryFn: () => lessonsApi.liveState.get.byLessonId(lesson_id),
    enabled: !!lesson_id && (lessonData?.status === "ready" || lessonData?.status === "in_progress"),
  });

  // Invalidate lesson data on mount and when tab comes back into focus
  // so we always show fresh data (e.g. after status updates in presentation mode)
  useEffect(() => {
    const invalidate = () => {
      for (const queryKey of getLessonDetailRefreshKeys(lesson_id)) {
        queryClient.invalidateQueries({ queryKey });
      }
    };
    invalidate();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") invalidate();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [queryClient, lesson_id]);

  // Check for query param to auto-open dialog
  useEffect(() => {
    const dialog = searchParams?.get("dialog");
    if (dialog === "present" && isLessonCreator) {
      setPresentDialogOpen(true);
    }
  }, [searchParams, isLessonCreator]);

  useEffect(() => {
    if (!lessonData || !isLessonCreator) return;
    const target = resolveRunLessonStatusRedirect({
      schoolSlug: school_id,
      lessonId: lesson_id,
      status: lessonData.status,
      isLessonCreator,
    });
    if (target) {
      router.replace(target);
    }
  }, [lessonData?.status, isLessonCreator, router, school_id, lesson_id]);

  // Show loading state while checking permissions
  if (isLoadingLesson || !currentUser || !lessonData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading lesson details...</p>
        </div>
      </div>
    );
  }

  // Non-owner: show Take Over CTA instead of redirecting
  if (!isLessonCreator) {
    const handleTakeOver = async () => {
      setIsTakingOver(true);
      try {
        const result = await lessonsApi.post.takeOver(lesson_id);
        if (result.error) {
          throw new Error(result.error.message ?? "Failed to take over lesson");
        }
        queryClient.invalidateQueries({ queryKey: lessonsKeys.detail(lesson_id) });
        queryClient.invalidateQueries({ queryKey: lessonsKeys.all() });
        toast.success("You have taken over this lesson");
        setShowTakeOverDialog(false);
        router.replace(`/schools/${school_id}/lessons/${lesson_id}/run-lesson`);
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
        <Button
          variant="ghost"
          onClick={() => {
            const target = getDefaultPagePath(school_id, lesson_id, lessonData.status);
            // This page is the default for ready/in_progress; back means the lessons list then.
            router.push(
              target.endsWith("/run-lesson") ? `/schools/${school_id}/lessons` : target
            );
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to lesson
        </Button>
        <div>
          <h1 className="text-3xl font-bold mb-2">Start Lesson</h1>
          <p className="text-muted-foreground">
            {canShowTakeOver
              ? "You need to take over this lesson to run it."
              : "Only the lesson owner can run this lesson."}
          </p>
        </div>
        {canShowTakeOver && (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <p className="text-muted-foreground text-center">
              Take over this lesson to access presentation mode and deliver it to the class.
            </p>
            <Button onClick={() => setShowTakeOverDialog(true)}>
              <HandMetal className="h-4 w-4 mr-2" />
              Take Over Lesson
            </Button>
          </CardContent>
        </Card>
        )}
        {canShowTakeOver && (
        <TakeOverLessonDialog
          open={showTakeOverDialog}
          onOpenChange={setShowTakeOverDialog}
          lesson={{
            id: lesson_id,
            assignedClasses: lessonData?.assignedClasses,
            teacher: lessonData?.teacher,
            createdByUserId: lessonData?.createdByUserId,
          }}
          onConfirm={handleTakeOver}
          isTakingOver={isTakingOver}
        />
        )}
      </div>
    );
  }

  const handlePresentDialogOpenChange = (open: boolean) => {
    setPresentDialogOpen(open);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (open) {
      params.set("dialog", "present");
    } else {
      params.delete("dialog");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname ?? "", { scroll: false });
  };

  const handlePresentAccept = () => {
    const presentUrl = `/schools/${school_id}/lessons/${lesson_id}/run-lesson/present`;
    window.open(presentUrl, "_blank", "noopener,noreferrer");
    handlePresentDialogOpenChange(false);
  };

  // Open schedule dialog with pre-populated values if lesson already has a schedule
  const openScheduleDialog = () => {
    if (lessonData?.scheduledFor) {
      const existingDate = new Date(lessonData.scheduledFor);
      setScheduleDate(existingDate);
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
    
    const [hours, minutes] = scheduleTime.split(":").map(Number);
    const scheduledDateTime = new Date(scheduleDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);
    
    // If there's an existing schedule, show confirmation dialog
    if (lessonData?.scheduledFor) {
      setPendingSchedule({ date: scheduledDateTime, time: scheduleTime });
      setShowConfirmOverwrite(true);
      return;
    }
    
    await saveSchedule(scheduledDateTime);
  };

  // Actually save the schedule
  const saveSchedule = async (scheduledDateTime: Date) => {
    setIsScheduling(true);
    try {
      await lessonsApi.put.update(lesson_id, { 
        scheduledFor: scheduledDateTime.toISOString() 
      });
      queryClient.invalidateQueries({ queryKey: ["lesson", lesson_id] });
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

  const isInProgress = lessonData?.status === "in_progress";
  const liveState = liveStateData?.data?.liveState;
  const currentIndex = liveState?.current_index ?? (liveState as { currentIndex?: number })?.currentIndex;
  const currentSlideNum = currentIndex != null ? currentIndex + 1 : null;
  const primaryButtonLabel = isInProgress
    ? (currentSlideNum != null ? `Continue lesson from slide ${currentSlideNum}` : "Continue Lesson")
    : "Start lesson";

  // Map API slides to SlideData for dialog preview (opening slide or current if in progress)
  const rawSlides = liveStateData?.data?.slides ?? [];
  const formattedSlides: SlideData[] = Array.isArray(rawSlides)
    ? rawSlides
      .map((slide: { topicSlideId: string; kind: string; position: string; textHtml?: string | null; imageUrl?: string | null; videoUrl?: string | null; videoStartS?: number | null; videoEndS?: number | null; effectiveNotes?: string | null; signedUrl?: string | null; signedImageUrl?: string | null }) => ({
        id: slide.topicSlideId,
        kind: slide.kind as SlideData["kind"],
        position: slide.position,
        textHtml: slide.textHtml,
        imageUrl: slide.imageUrl,
        videoUrl: slide.videoUrl,
        videoStartS: slide.videoStartS,
        videoEndS: slide.videoEndS,
        effectiveNotes: slide.effectiveNotes,
        signedUrl: slide.signedUrl ?? null,
        signedImageUrl: slide.signedImageUrl ?? slide.signedUrl ?? null,
      }))
      .sort(compareSlidesByPosition)
    : [];
  const previewSlideIndex = isInProgress && currentIndex != null ? currentIndex : 0;
  const previewSlide = formattedSlides[previewSlideIndex] ?? null;

  return (
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Start Lesson</h1>
        
      </div>

      {/* Scheduling Alert */}
      {isScheduledForFuture && lessonData?.scheduledFor && (
        <Alert className="border-blue-500/50 bg-blue-500/10">
          <Clock className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-600 dark:text-blue-400">
            Lesson Scheduled
          </AlertTitle>
          <AlertDescription className="text-muted-foreground flex flex-col gap-0">
          
            <div className="flex flex-col -space-y-2">
            <p className="text-4xl font-black flex flex-row items-center gap-1">
              {/* <ChevronsRight className="h-5 w-5" /> */}
             <LiveCountdown scheduledFor={lessonData.scheduledFor} /> 
            </p>
            <p className=" font-light">
            {new Date(lessonData.scheduledFor).toLocaleString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}
            </p>
            </div>
           
            <Separator className="my-2" />
            <p>
              Click Start lesson now to start immediately, or wait until the scheduled time.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {isOverdue && lessonData?.scheduledFor && (
        <Alert className="border-orange-500/50 bg-orange-500/10">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <AlertTitle className="text-orange-600 dark:text-orange-400">
            Scheduled Time Passed
          </AlertTitle>
          <AlertDescription className="text-muted-foreground">
            This lesson was scheduled for {new Date(lessonData.scheduledFor).toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })} Click Start lesson now to start.
          </AlertDescription>
        </Alert>
      )}

      {!lessonData?.scheduledFor && (
        <Alert className="border-muted">
          <CalendarIcon className="h-4 w-4" />
          <AlertTitle>Not Scheduled</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Click Start lesson now to start immediately, or Schedule lesson for later.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          size="lg"
          onClick={() => handlePresentDialogOpenChange(true)}
          className="bg-[var(--brand-bullyproof-primary)] text-secondary hover:bg-[var(--brand-bullyproof-primary)]/90 sm:min-w-[200px] capitalize"
        >
          <Presentation className="h-5 w-5" />
          {primaryButtonLabel}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={openScheduleDialog}
          className="sm:min-w-[200px]"
        >
          <CalendarIcon className="h-5 w-5" />
          {lessonData?.scheduledFor ? "Change schedule time" : "Schedule lesson for later"}
        </Button>
      </div>

      {/* Presentation Mode Dialog */}
      <Dialog open={presentDialogOpen} onOpenChange={handlePresentDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Presentation Mode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="w-full aspect-video rounded-lg border overflow-hidden bg-muted/30">
              {previewSlide ? (
                <SlideRenderer slide={previewSlide} className="w-full h-full" thumbnailOnly />
              ) : isSlideLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="w-full h-full bg-muted/50" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              You&apos;re about to open a <strong>new tab</strong>, which will show the slides in full screen. This is what the class will see.
            </p>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setPresentHelpOpen(true)}
              className="gap-2"
            >
              <HelpCircle className="h-4 w-4" />
              Help
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => handlePresentDialogOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePresentAccept}
                className="bg-[var(--brand-bullyproof-primary)] text-secondary hover:bg-[var(--brand-bullyproof-primary)]/90 gap-2"
              >
                Open New Tab
                <SquareArrowOutUpRight className="h-5 w-5" />
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Presentation Screen Help Dialog */}
      <Dialog open={presentHelpOpen} onOpenChange={setPresentHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Presentation Screen Help</DialogTitle>
            <DialogDescription>
              How to display the presentation on a projector or second screen.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground flex flex-col gap-8 py-4">
            <div>
              <p>
                <strong className="text-foreground">
                  Duplicate your screen
                </strong>
              </p>
              <p>
                Press{" "}
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                  Windows + P
                </kbd>{" "}
                (Windows) or{" "}
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                  Cmd + F1
                </kbd>{" "}
                (Mac) and select &quot;Duplicate&quot;
              </p>
            </div>
            <div>
              <p>
                <strong className="text-foreground">
                  Extend your screen (Recommended)
                </strong>
              </p>
              <p>
                Press{" "}
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                  Windows + P
                </kbd>{" "}
                (Windows) or{" "}
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                  Cmd + F1
                </kbd>{" "}
                (Mac) and select &quot;Extend&quot;. This allows you to see the
                controls on your main screen while the class sees the
                presentation on the extended display.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                  aria-invalid={isScheduleTimeInPast}
                />
                {isScheduleTimeInPast && (
                  <Alert variant="destructive" className="py-2 space-x-0">
                    <ChevronsUp className="h-4 w-4 animate-bounce-up" />
                    <AlertDescription>
                      This time has already passed
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              {/* Summary Card */}
              {!scheduleDate && (
                <Alert variant="destructive" className="py-2 space-x-0">
                  <ChevronsLeft className="h-4 w-4 animate-bounce-left" />
                  <AlertDescription>
                    You must select a day
                  </AlertDescription>
                </Alert>
              )}
              <Card className={`bg-muted/50 py-0 ${!scheduleDate ? "border-destructive" : ""}`}>
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
