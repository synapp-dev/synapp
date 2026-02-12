"use client";

import { useState, use, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Presentation, Settings, Loader2, CalendarIcon, Clock, AlertCircle, HandMetal, ArrowLeft } from "lucide-react";
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
import { useSearchParams, useRouter } from "next/navigation";
import { useLessonById } from "@/entities/lessons/api/useLessonById";
import { useMeStore } from "@/entities/me/model/store";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { lessonsKeys } from "@/entities/lessons/model/keys";
import { TakeOverLessonDialog } from "@/components/molecules/take-over-lesson-dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const [presentDialogOpen, setPresentDialogOpen] = useState(false);
  // const [controlsDialogOpen, setControlsDialogOpen] = useState(false); // Commented out - control mode disabled

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

  const takeOverableStatuses = ["preparing", "ready", "in_progress"];
  const canShowTakeOver =
    !isLessonCreator &&
    lessonData?.status &&
    takeOverableStatuses.includes(lessonData.status);

  // Check for query param to auto-open dialog
  useEffect(() => {
    const dialog = searchParams?.get("dialog");
    if (dialog === "present" && isLessonCreator) {
      setPresentDialogOpen(true);
    }
  }, [searchParams, isLessonCreator]);

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
          onClick={() => router.push(`/schools/${school_id}/lessons/${lesson_id}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to lesson
        </Button>
        <div>
          <h1 className="text-3xl font-bold mb-2">Run Lesson</h1>
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

  const handlePresentAccept = () => {
    const presentUrl = `/schools/${school_id}/lessons/${lesson_id}/run-lesson/present`;
    window.open(presentUrl, "_blank", "noopener,noreferrer");
    setPresentDialogOpen(false);
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

  // Commented out - control mode disabled
  // const handleControlsAccept = () => {
  //   const controlsUrl = `/schools/${school_id}/lessons/${lesson_id}/run-lesson/controls`;
  //   window.open(controlsUrl, "_blank", "noopener,noreferrer");
  //   setControlsDialogOpen(false);
  // };

  return (
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Run Lesson</h1>
        <p className="text-muted-foreground">
          Choose how you'd like to deliver your lesson to the class.
        </p>
      </div>

      {/* Scheduling Alert */}
      {isScheduledForFuture && lessonData?.scheduledFor && (
        <Alert className="border-blue-500/50 bg-blue-500/10">
          <Clock className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-600 dark:text-blue-400">
            Lesson Scheduled
          </AlertTitle>
          <AlertDescription className="text-muted-foreground">
            This lesson is scheduled to start in <LiveCountdown scheduledFor={lessonData.scheduledFor} />.
            Click Presentation Mode to start immediately, or wait until the scheduled time.
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
            })}. Click Presentation Mode to start now.
          </AlertDescription>
        </Alert>
      )}

      {!lessonData?.scheduledFor && (
        <Alert className="border-muted">
          <CalendarIcon className="h-4 w-4" />
          <AlertTitle>Not Scheduled</AlertTitle>
          <AlertDescription className="text-muted-foreground flex flex-col gap-2">
            <span>
              Click Presentation Mode to start immediately, or schedule it for later.
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={openScheduleDialog}
              className="w-fit"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Schedule Lesson
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Presentation Mode Card */}
        <Card
          className="h-full hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => setPresentDialogOpen(true)}
        >
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Presentation className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Presentation Mode</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-sm">
              Display slides in fullscreen mode for your classroom. This view
              shows only the slides with minimal controls, perfect for
              projecting to students. Navigate with arrow keys and hover near
              the bottom to reveal controls.
            </CardDescription>
          </CardContent>
        </Card>

        {/* Control Mode Card - Disabled for now */}
        <Card
          className="h-full opacity-50 cursor-not-allowed"
          // onClick={() => setControlsDialogOpen(true)} // Commented out - control mode disabled
        >
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-muted-foreground">
                Control Mode
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-sm">
              View slides with teacher notes simultaneously. This mode shows
              slides at the top and your notes at the bottom, giving you full
              control while presenting. Perfect for managing your lesson flow
              and staying on track with your talking points.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Presentation Mode Dialog */}
      <Dialog open={presentDialogOpen} onOpenChange={setPresentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Presentation Mode</DialogTitle>
            <DialogDescription>
              A new tab will open with the presentation view.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-foreground">
              This tab will be what the class will see. You should move this tab
              to open on a projector screen.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">
                  You may duplicate your screen:
                </strong>{" "}
                Press{" "}
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                  Windows + P
                </kbd>{" "}
                (Windows) or{" "}
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                  Cmd + F1
                </kbd>{" "}
                (Mac) and select "Duplicate"
              </p>
              <p>
                <strong className="text-foreground">
                  However, it is recommended you extend your screen:
                </strong>{" "}
                Press{" "}
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                  Windows + P
                </kbd>{" "}
                (Windows) or{" "}
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                  Cmd + F1
                </kbd>{" "}
                (Mac) and select "Extend". This allows you to see the controls
                on your main screen while the class sees the presentation on the
                extended display.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPresentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handlePresentAccept}>Open Presentation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Controls Mode Dialog - Commented out - control mode disabled */}
      {/* <Dialog open={controlsDialogOpen} onOpenChange={setControlsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Control Mode</DialogTitle>
            <DialogDescription>
              A new tab will open with the control view.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-foreground">
              This view is for you and should not be shown to the class.
            </p>
            <p className="text-sm text-muted-foreground">
              You can view the controls on your laptop, tablet, or phone by
              signing in and selecting "Controls" from the lesson run page.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setControlsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleControlsAccept}>Open Controls</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}

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
              disabled={!scheduleDate || isScheduling}
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
