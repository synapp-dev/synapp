"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Settings,
  Maximize,
  Minimize,
  Joystick,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Separator } from "@workspace/ui/components/separator";
import { SlideRenderer } from "./slide-renderer";
import { useLessonLiveState } from "@/hooks/use-lesson-live-state";
import { usePrefetchTopicImages } from "@/hooks/use-prefetch-topic-images";
import { useLessonById } from "@/entities/lessons/api/useLessonById";
import { useMeStore } from "@/entities/me/model/store";
import { lessonsApi } from "@/entities/lessons/api/endpoints";

interface PresentationModeProps {
  lessonId: string;
}

export function PresentationMode({ lessonId }: PresentationModeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    slides,
    currentSlideIndex,
    currentSlide,
    updateSlide,
    isLoading,
    error,
  } = useLessonLiveState(lessonId);

  // Check permissions in parallel (non-blocking)
  const { data: lessonData, isLoading: isLoadingLesson } =
    useLessonById(lessonId);
  const currentUser = useMeStore((s) => s.currentUser);
  const isLessonCreator = currentUser?.id === lessonData?.createdByUserId;

  // Pre-fetch all topic images in the background on page load
  usePrefetchTopicImages(slides, !isLoading && slides.length > 0);

  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCompletionSlide, setShowCompletionSlide] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [exitCountdown, setExitCountdown] = useState(10);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Sync dialog state with query parameter
  const showExitDialog = searchParams.get("exit") === "true";

  const nextSlide = useCallback(() => {
    // If we're on the last slide, show completion slide instead
    if (currentSlideIndex === slides.length - 1) {
      setShowCompletionSlide(true);
    } else if (currentSlideIndex < slides.length - 1) {
      updateSlide(currentSlideIndex + 1);
    }
  }, [currentSlideIndex, slides.length, updateSlide]);

  const prevSlide = useCallback(() => {
    // If we're showing completion slide, go back to last regular slide
    if (showCompletionSlide) {
      setShowCompletionSlide(false);
    } else if (currentSlideIndex > 0) {
      updateSlide(currentSlideIndex - 1);
    }
  }, [currentSlideIndex, showCompletionSlide, updateSlide]);

  // Mark lesson as pending_review when completion slide is shown
  useEffect(() => {
    if (showCompletionSlide && !isCompleted && !isCompleting) {
      const markAsPendingReview = async () => {
        try {
          setIsCompleting(true);
          const result = await lessonsApi.put.update(lessonId, {
            status: "pending_review",
          });

          if (result.error) {
            console.error(
              "Failed to mark lesson as pending review:",
              result.error
            );
          } else {
            setIsCompleted(true);
          }
        } catch (err) {
          console.error("Error marking lesson as pending review:", err);
        } finally {
          setIsCompleting(false);
        }
      };

      markAsPendingReview();
    }
  }, [showCompletionSlide, isCompleted, isCompleting, lessonId]);

  const handleClosePresentation = useCallback(() => {
    window.close();
  }, []);

  const handleExitRequest = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("exit", "true");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setExitCountdown(10);
  }, [router, pathname, searchParams]);

  const handleCloseExitDialog = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("exit");
    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(newUrl, { scroll: false });
    setExitCountdown(10);
  }, [router, pathname, searchParams]);

  // Handle exit countdown timer
  useEffect(() => {
    if (!showExitDialog) return;

    if (exitCountdown <= 0) {
      window.close();
      return;
    }

    const timer = setInterval(() => {
      setExitCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showExitDialog, exitCountdown]);

  // Non-blocking permission check - only redirect after slides are loaded
  useEffect(() => {
    // Only check permissions after slides have loaded and lesson data is available
    if (isLoading || isLoadingLesson || !lessonData || !currentUser) {
      return;
    }

    // If user is not the creator, redirect them
    if (!isLessonCreator) {
      // Extract school_id from current path or redirect to dashboard
      const pathParts = window.location.pathname.split("/");
      const schoolIndex = pathParts.indexOf("schools");
      if (schoolIndex !== -1 && pathParts[schoolIndex + 1]) {
        const schoolId = pathParts[schoolIndex + 1];
        router.replace(`/schools/${schoolId}/lessons/${lessonId}`);
      } else {
        router.replace("/dashboard");
      }
    }
  }, [
    isLoading,
    isLoadingLesson,
    lessonData,
    currentUser,
    isLessonCreator,
    router,
    lessonId,
  ]);

  // All hooks must be called before any conditional returns
  // Keyboard navigation
  useEffect(() => {
    if (isLoading || error || !slides.length || !currentSlide) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showCompletionSlide) {
        // On completion slide, only allow escape to close
        if (e.key === "Escape") {
          handleExitRequest();
        }
        return;
      }

      if (e.key === "ArrowRight") {
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        prevSlide();
      } else if (e.key === "Escape") {
        // If dialog is open, close it and remove query param
        if (showExitDialog) {
          handleCloseExitDialog();
        } else {
          // Show exit confirmation dialog
          handleExitRequest();
        }
      } else if (e.key === "f" || e.key === "F") {
        // Toggle fullscreen
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        } else {
          document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    nextSlide,
    prevSlide,
    router,
    isLoading,
    error,
    slides.length,
    currentSlide,
    showCompletionSlide,
    handleExitRequest,
    handleCloseExitDialog,
    showExitDialog,
  ]);

  // Fullscreen change detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Mouse movement detection for controls
  useEffect(() => {
    if (isLoading || error || !slides.length || showCompletionSlide) return;

    let timeoutId: NodeJS.Timeout;

    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setShowControls(false);
      }, 3000); // Hide controls after 3 seconds of no movement
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeoutId);
    };
  }, [isLoading, error, slides.length, currentSlide, showCompletionSlide]);

  // Update date and time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Now we can have conditional returns after all hooks
  // Loading state
  if (isLoading) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Loading slides...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  // Early return if no slides
  if (!slides.length) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>No slides available</p>
        </div>
      </div>
    );
  }

  // Show completion slide if we've navigated past the last regular slide
  if (showCompletionSlide) {
    return (
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-muted">
        <div className="flex flex-col items-center justify-center gap-8 p-8 text-center max-w-2xl">
          <CheckCircle2 className="h-24 w-24 text-primary" />
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-foreground">
              Topic Complete
            </h1>
            <p className="text-lg text-muted-foreground">
              You have completed all slides in this topic.
            </p>
            <Button
              onClick={handleClosePresentation}
              size="lg"
              className="mt-6"
            >
              Click here to close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Ensure we have a current slide for regular slides
  if (!currentSlide) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Loading slide...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized warning if permission check completed and user is not creator
  // This appears as an overlay but doesn't block the slides from showing
  const showUnauthorizedWarning =
    !isLoading &&
    !isLoadingLesson &&
    lessonData &&
    currentUser &&
    !isLessonCreator;

  // Don't auto-enter fullscreen - let user control it via button or F key

  return (
    <div
      className={cn(
        "relative w-full h-full flex items-center justify-center overflow-hidden bg-muted",
        !showControls && "cursor-none"
      )}
    >
      {/* Unauthorized warning overlay - shows if user is not the lesson creator */}
      {showUnauthorizedWarning && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <div className="text-center space-y-4 max-w-md px-6">
            <p className="text-destructive font-medium text-lg">
              Only the teacher can deliver this lesson
            </p>
            <p className="text-muted-foreground">
              Redirecting you back to the lesson page...
            </p>
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
          </div>
        </div>
      )}
      {/* Main slide display */}
      <div className="w-full h-full flex items-center justify-center">
        {/* 16:9 aspect ratio container - maximizes space while maintaining aspect ratio */}
        <div
          className="flex items-center justify-center"
          style={{
            width: "min(100vw, calc(100vh * 16 / 9))",
            height: "min(100vh, calc(100vw * 9 / 16))",
            aspectRatio: "16 / 9",
          }}
        >
          <div
            key={currentSlide.id}
            className="w-full h-full flex items-center justify-center"
            style={{
              animation: "slide-up-fade-in 0.5s ease-out forwards",
            }}
          >
            <SlideRenderer
              slide={currentSlide}
              className="w-full h-full flex items-center justify-center"
            />
          </div>
        </div>
      </div>

      {/* Instructions overlay - appears on mouse movement at top */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 transition-all duration-300 ease-in-out",
          showControls
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-4 pointer-events-none"
        )}
      >
        <div className="absolute left-1/2 top-0 -translate-x-1/2 flex items-center gap-2">
          {/* Topic title - separate tab */}
          <div className="px-6 py-3 h-12 bg-background border border-border rounded-b-lg shadow-sm flex items-center gap-4">
            <p className="text-foreground text-sm font-medium">
              {lessonData?.topic?.title || "Loading..."}
            </p>
            <span className="text-muted-foreground text-xs">
              {currentDateTime.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}{" "}
              {currentDateTime.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </span>
          </div>

          {/* Fullscreen and Exit buttons - separate tab */}
          <div className="px-6 py-3 h-12 bg-background border border-border rounded-b-lg shadow-sm flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                    setIsFullscreen(true);
                  } else {
                    await document.exitFullscreen();
                    setIsFullscreen(false);
                  }
                } catch (error) {
                  console.error("Error toggling fullscreen:", error);
                }
              }}
              className="text-foreground hover:bg-foreground/20 flex items-center gap-2"
            >
              <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                F
              </kbd>
              <span className="text-sm">Fullscreen</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExitRequest}
              className="text-foreground hover:bg-foreground/20 flex items-center gap-2"
            >
              <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                Esc
              </kbd>
              <span className="text-sm">Exit</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Controls overlay - appears on hover at bottom */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 transition-all duration-300 ease-in-out",
          showControls
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 px-8 py-4 flex items-center justify-center bg-background border border-border rounded-lg shadow-sm">
          {/* Center - Navigation buttons and slide counter */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevSlide}
              disabled={currentSlideIndex === 0 && !showCompletionSlide}
              className="text-foreground hover:bg-foreground/20 disabled:opacity-50 flex items-center gap-2"
            >
              <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ←
              </kbd>
              <span className="text-sm">Previous</span>
            </Button>

            <div className="text-foreground text-sm font-medium text-center min-w-[80px]">
              {currentSlideIndex + 1} / {slides.length}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={nextSlide}
              disabled={showCompletionSlide}
              className="text-foreground hover:bg-foreground/20 disabled:opacity-50 flex items-center gap-2"
            >
              <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                →
              </kbd>
              <span className="text-sm">Next</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Exit confirmation dialog */}
      <Dialog
        open={showExitDialog}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseExitDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center space-y-2">
            <DialogTitle className="text-center">
              Are you sure you want to leave?
            </DialogTitle>
            <DialogDescription className="text-center">
              Window automatically closing in {exitCountdown} seconds
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-destructive transition-all duration-1000 ease-linear animate-pulse"
                style={{ width: `${(exitCountdown / 10) * 100}%` }}
              />
            </div>
          </div>
          <DialogFooter className="flex !justify-center gap-2 sm:!justify-center">
            <Button variant="ghost" onClick={handleCloseExitDialog}>
              Stay
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                window.close();
              }}
            >
              Leave Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
