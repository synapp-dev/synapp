"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  const {
    slides,
    currentSlideIndex,
    currentSlide,
    updateSlide,
    isLoading,
    error,
  } = useLessonLiveState(lessonId);

  // Check if user is the lesson creator
  const { data: lessonData, isLoading: isLoadingLesson } =
    useLessonById(lessonId);
  const currentUser = useMeStore((s) => s.currentUser);
  const isLessonCreator = currentUser?.id === lessonData?.createdByUserId;

  // Redirect if user is not the creator
  useEffect(() => {
    if (!isLoadingLesson && lessonData && currentUser) {
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
    }
  }, [
    isLoadingLesson,
    lessonData,
    currentUser,
    isLessonCreator,
    router,
    lessonId,
  ]);

  // Pre-fetch all topic images in the background on page load
  usePrefetchTopicImages(slides, !isLoading && slides.length > 0);

  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCompletionSlide, setShowCompletionSlide] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

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

  // All hooks must be called before any conditional returns
  // Keyboard navigation
  useEffect(() => {
    if (isLoading || error || !slides.length || !currentSlide) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showCompletionSlide) {
        // On completion slide, only allow escape to close
        if (e.key === "Escape") {
          window.close();
        }
        return;
      }

      if (e.key === "ArrowRight") {
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        prevSlide();
      } else if (e.key === "Escape") {
        // Terminate the tab
        window.close();
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

  // Show loading state while checking permissions
  if (isLoadingLesson || !currentUser || !lessonData) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading lesson details...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized message if not creator (will redirect, but show message briefly)
  if (!isLessonCreator) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive font-medium">
            Only the teacher can deliver this lesson
          </p>
          <p className="text-muted-foreground mt-2">Redirecting...</p>
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

  // Don't auto-enter fullscreen - let user control it via button or F key

  return (
    <div
      className={cn(
        "relative w-full h-full flex items-center justify-center overflow-hidden bg-muted",
        !showControls && "cursor-none"
      )}
    >
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
          "absolute top-0 left-0 right-0 backdrop-blur-sm transition-all duration-300 ease-in-out",
          showControls
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-4 pointer-events-none"
        )}
      >
        <div className="container mx-auto px-8 py-4 bg-muted-foreground/10 flex items-center justify-center gap-48 rounded-b-lg">
          <p className="text-foreground/60 text-sm text-center">
            Use{" "}
            <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ←
            </kbd>{" "}
            <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              →
            </kbd>{" "}
            to navigate
          </p>
          <p className="text-foreground/60 text-sm text-center">
            Press{" "}
            <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              F
            </kbd>{" "}
            for fullscreen
          </p>
          <p className="text-foreground/60 text-sm text-center">
            Press{" "}
            <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              Esc
            </kbd>{" "}
            to exit
          </p>
        </div>
      </div>

      {/* Controls overlay - appears on hover at bottom */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 backdrop-blur-sm transition-all duration-300 ease-in-out",
          showControls
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <div className="container mx-auto px-8 py-4 flex items-center justify-between bg-muted-foreground/10 rounded-t-lg">
          {/* Slide counter */}
          <div className="text-foreground text-sm font-medium">
            {currentSlideIndex + 1} / {slides.length}
          </div>

          {/* Navigation controls */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevSlide}
              disabled={currentSlideIndex === 0 && !showCompletionSlide}
              className="text-foreground hover:bg-foreground/20 disabled:opacity-50"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={nextSlide}
              disabled={showCompletionSlide}
              className="text-foreground hover:bg-foreground/20 disabled:opacity-50"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
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
              className="text-foreground hover:bg-foreground/20"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen (F)"}
            >
              {isFullscreen ? (
                <Minimize className="h-6 w-6" />
              ) : (
                <Maximize className="h-6 w-6" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const currentPath = window.location.pathname;
                const newPath = currentPath.replace("/present", "/controls");
                router.push(newPath);
              }}
              className="text-foreground hover:bg-foreground/20"
              title="Switch to Control Mode"
            >
              <Joystick className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                // Terminate the tab
                window.close();
              }}
              className="text-foreground hover:bg-foreground/20"
              title="Exit presentation (Esc)"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
