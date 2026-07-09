"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import {
  Loader2,
  PartyPopper,
  ChevronsRight,
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
import { Card, CardContent } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import Image from "next/image";
import { LessonCard } from "@/entities/lessons/ui/lesson-card";
import { SlideRenderer, type SlideData } from "./slide-renderer";
import { useLessonLiveState } from "@/hooks/use-lesson-live-state";
import { usePrefetchTopicImages } from "@/hooks/use-prefetch-topic-images";
import { usePreloadSlideImages } from "@/hooks/use-preload-slide-images";
import { useLessonById } from "@/entities/lessons/api/useLessonById";
import { useMeStore } from "@/entities/me/model/store";
import { lessonsApi } from "@/entities/lessons/api/endpoints";

interface PresentationModeProps {
  lessonId: string;
  schoolSlug?: string;
}

export function PresentationMode({
  lessonId,
  schoolSlug,
}: PresentationModeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    slides: allSlides,
    currentSlide,
    updateSlide,
    isLoading,
    error,
  } = useLessonLiveState(lessonId);

  // Helper function to check if a slide has content
  const slideHasContent = useCallback((slide: SlideData): boolean => {
    const hasImageUrl = !!slide.imageUrl && slide.imageUrl.trim() !== "";
    const hasVideoUrl = !!slide.videoUrl && slide.videoUrl.trim() !== "";
    const hasTextHtml = slide.kind === "text" && !!slide.textHtml?.trim();
    
    return hasImageUrl || hasVideoUrl || hasTextHtml;
  }, []);

  // Filter out empty slides (slides without any content)
  const slides = useMemo(() => {
    return allSlides.filter(slideHasContent);
  }, [allSlides, slideHasContent]);

  // Find the current slide in the filtered list
  const filteredCurrentSlide = useMemo(() => {
    if (!currentSlide) return slides[0] || null;
    // Find the slide in filtered list by ID
    const found = slides.find((slide) => slide.id === currentSlide.id);
    // If current slide was filtered out (empty), use first valid slide
    return found || slides[0] || null;
  }, [currentSlide, slides]);

  // Find the current slide index in the filtered list
  const filteredCurrentSlideIndex = useMemo(() => {
    if (!currentSlide) return 0;
    const index = slides.findIndex((slide) => slide.id === currentSlide.id);
    // If current slide was filtered out (empty), use first valid slide
    return index >= 0 ? index : 0;
  }, [currentSlide, slides]);

  // Cache the mapping from filtered index to original index for faster lookups
  const filteredToOriginalIndexMap = useMemo(() => {
    const map = new Map<number, number>();
    slides.forEach((slide, filteredIndex) => {
      const originalIndex = allSlides.findIndex((s) => s.id === slide.id);
      if (originalIndex >= 0) {
        map.set(filteredIndex, originalIndex);
      }
    });
    return map;
  }, [slides, allSlides]);

  // If current slide was filtered out, navigate to first valid slide
  useEffect(() => {
    if (!isLoading && currentSlide && slides.length > 0) {
      const foundIndex = slides.findIndex((slide) => slide.id === currentSlide.id);
      if (foundIndex < 0) {
        // Current slide is empty and was filtered out, navigate to first valid slide
        const originalIndex = filteredToOriginalIndexMap.get(0);
        if (originalIndex !== undefined && originalIndex >= 0) {
          updateSlide(originalIndex);
        }
      }
    }
  }, [isLoading, currentSlide, slides.length, filteredToOriginalIndexMap, updateSlide]);

  // Check permissions in parallel (non-blocking)
  const { data: lessonData, isLoading: isLoadingLesson } =
    useLessonById(lessonId);
  const currentUser = useMeStore((s) => s.currentUser);
  const isLessonCreator = currentUser?.id === lessonData?.createdByUserId;

  // Pre-fetch all topic images in the background on page load
  usePrefetchTopicImages(slides, !isLoading && slides.length > 0);
  
  // Preload images for upcoming slides into browser cache
  usePreloadSlideImages(
    slides,
    filteredCurrentSlideIndex,
    !isLoading && slides.length > 0,
    2 // Preload next 2 slides
  );

  const [showControls, setShowControls] = useState(false);
  const [, setIsFullscreen] = useState(false);
  const [showCompletionSlide, setShowCompletionSlide] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [exitCountdown, setExitCountdown] = useState(10);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Sync dialog state with query parameter
  const showExitDialog = searchParams.get("exit") === "true";

  const nextSlide = useCallback(() => {
    // If we're on the last slide, show completion slide instead
    if (filteredCurrentSlideIndex === slides.length - 1) {
      setShowCompletionSlide(true);
    } else if (filteredCurrentSlideIndex < slides.length - 1) {
      // Use cached mapping for faster lookup
      const nextFilteredIndex = filteredCurrentSlideIndex + 1;
      const originalIndex = filteredToOriginalIndexMap.get(nextFilteredIndex);
      if (originalIndex !== undefined && originalIndex >= 0) {
        // Update immediately without waiting for API response
        updateSlide(originalIndex);
      }
    }
  }, [filteredCurrentSlideIndex, slides.length, filteredToOriginalIndexMap, updateSlide]);

  const prevSlide = useCallback(() => {
    // If we're showing completion slide, go back to last regular slide
    if (showCompletionSlide) {
      setShowCompletionSlide(false);
    } else if (filteredCurrentSlideIndex > 0) {
      // Use cached mapping for faster lookup
      const prevFilteredIndex = filteredCurrentSlideIndex - 1;
      const originalIndex = filteredToOriginalIndexMap.get(prevFilteredIndex);
      if (originalIndex !== undefined && originalIndex >= 0) {
        // Update immediately without waiting for API response
        updateSlide(originalIndex);
      }
    }
  }, [filteredCurrentSlideIndex, showCompletionSlide, filteredToOriginalIndexMap, updateSlide]);

  // Mark lesson as feedback when completion slide is shown
  useEffect(() => {
    if (showCompletionSlide && !isCompleted && !isCompleting) {
      const markAsFeedback = async () => {
        try {
          setIsCompleting(true);
          const result = await lessonsApi.put.update(lessonId, {
            status: "feedback",
          });

          if (result.error) {
            console.error(
              "Failed to mark lesson as feedback:",
              result.error
            );
          } else {
            setIsCompleted(true);
          }
        } catch (err) {
          console.error("Error marking lesson as feedback:", err);
        } finally {
          setIsCompleting(false);
        }
      };

      markAsFeedback();
    }
  }, [showCompletionSlide, isCompleted, isCompleting, lessonId]);

  // Transition from ready to in_progress when moving from slide 1 to slide 2
  const [hasTransitionedToInProgress, setHasTransitionedToInProgress] = useState(false);
  useEffect(() => {
    if (
      !isLoading &&
      !isLoadingLesson &&
      lessonData &&
      filteredCurrentSlideIndex === 1 &&
      lessonData.status === "ready" &&
      !hasTransitionedToInProgress
    ) {
      const transitionToInProgress = async () => {
        try {
          const result = await lessonsApi.put.update(lessonId, {
            status: "in_progress",
          });

          if (result.error) {
            console.error(
              "Failed to transition lesson to in_progress:",
              result.error
            );
          } else {
            setHasTransitionedToInProgress(true);
          }
        } catch (err) {
          console.error("Error transitioning lesson to in_progress:", err);
        }
      };

      transitionToInProgress();
    }
  }, [
    isLoading,
    isLoadingLesson,
    lessonData,
    filteredCurrentSlideIndex,
    hasTransitionedToInProgress,
    lessonId,
  ]);

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
    if (isLoading || error || !slides.length || !filteredCurrentSlide) return;

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
    filteredCurrentSlide,
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

  // Note: Controls visibility is now solely controlled by mouse movement timeout
  // Removing automatic hide on slide change to prevent conflicts with mouse movement handler

  // Mouse movement detection for controls
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const showControlsWithTimeout = useCallback(() => {
    setShowControls(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000); // Hide controls after 3 seconds of no movement
  }, []);
  
  useEffect(() => {
    if (isLoading || error || !slides.length || showCompletionSlide) return;

    const handleMouseMove = () => {
      showControlsWithTimeout();
    };

    // Attach to both document and window for maximum compatibility
    document.addEventListener("mousemove", handleMouseMove, { passive: true, capture: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true, capture: true });
    
    return () => {
      document.removeEventListener("mousemove", handleMouseMove, { capture: true });
      window.removeEventListener("mousemove", handleMouseMove, { capture: true });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isLoading, error, slides.length, showCompletionSlide, showControlsWithTimeout]);

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
      <div className="relative w-full min-h-screen flex items-center justify-center pb-20">
        <Card className="flex flex-col items-center justify-center gap-12 p-12 bg-transparent border-0 shadow-none">
          <Image
            src="/images/bullyproof-logo.svg"
            alt="Bullyproof"
            width={600}
            height={192}
            className="h-72 w-auto object-contain"
          />
          <p className="text-[var(--brand-bullyproof-primary)] text-4xl font-medium capitalize animate-pulse">Loading slides...</p>
        </Card>
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
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-muted p-6">
        <Card className="w-full max-w-xl overflow-hidden">
          <CardContent className="flex flex-col items-center gap-6 p-8">
            {/* <Image
              src="/images/bullyproof-logo.svg"
              alt="Bullyproof"
              width={180}
              height={48}
              className="h-12 w-auto object-contain"
            /> */}
            {lessonData && schoolSlug ? (
              <div className="w-full max-w-md">
                <LessonCard
                  lesson={lessonData}
                  schoolSlug={schoolSlug}
                  displayOnly
                />
              </div>
            ) : (
              <div className="w-full max-w-md aspect-video rounded-lg bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <div className="flex flex-col items-center gap-2 text-center">
              <Separator className="w-full mb-4 mt-2" />
              <div className="flex items-center justify-center gap-2 text-[var(--brand-bullyproof-primary)]">
                <PartyPopper className="h-8 w-8 shrink-0" />
                <h1 className="text-4xl font-bold">
                  Lesson Complete!
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Please click finish to mark the lesson as complete.
              </p>
            </div>
            <Button
              onClick={handleClosePresentation}
              size="lg"
              className="mt-2 bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90 gap-1 w-full max-w-3xs"
            >
              Finish
              <ChevronsRight className="h-4 w-4 shrink-0 [animation:var(--animate-bounce-right)]" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ensure we have a current slide for regular slides
  if (!filteredCurrentSlide) {
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
      onMouseMove={showControlsWithTimeout}
    >
      {/* Unauthorized warning overlay - shows if user is not the lesson creator */}
      {showUnauthorizedWarning && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <div className="text-center space-y-4 max-w-md px-6">
            <p className="text-destructive font-medium text-lg">
              Only the teacher can run this lesson
            </p>
            <p className="text-muted-foreground">
              Redirecting you back to the lesson page...
            </p>
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
          </div>
        </div>
      )}
      {/* Main slide display */}
      <div className="w-full h-full flex items-center justify-center relative">
        {/* 16:9 aspect ratio container - maximizes space while maintaining aspect ratio */}
        <div
          className="flex items-center justify-center relative"
          style={{
            width: "min(100vw, calc(100vh * 16 / 9))",
            height: "min(100vh, calc(100vw * 9 / 16))",
            aspectRatio: "16 / 9",
          }}
        >
          {/* Pre-render current, next, and previous slides for instant transitions */}
          {slides.map((slide, index) => {
            const isCurrent = index === filteredCurrentSlideIndex;
            const isNext = index === filteredCurrentSlideIndex + 1;
            const isPrev = index === filteredCurrentSlideIndex - 1;
            
            // Only render current slide and adjacent slides
            if (!isCurrent && !isNext && !isPrev) {
              return null;
            }

            return (
              <div
                key={slide.id}
                className={cn(
                  "absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-100 ease-in-out",
                  isCurrent ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                )}
                style={{
                  // Ensure smooth transition
                  willChange: isCurrent || isNext || isPrev ? "opacity" : "auto",
                }}
              >
                <SlideRenderer
                  slide={slide}
                  className="w-full h-full flex items-center justify-center"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Instructions overlay - appears on mouse movement at top */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 transition-all duration-300 ease-in-out z-50",
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
          "absolute bottom-0 left-0 right-0 transition-all duration-300 ease-in-out z-50",
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
              disabled={filteredCurrentSlideIndex === 0 && !showCompletionSlide}
              className="text-foreground hover:bg-foreground/20 disabled:opacity-50 flex items-center gap-2"
            >
              <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ←
              </kbd>
              <span className="text-sm">Previous</span>
            </Button>

            <div className="text-foreground text-sm font-medium text-center min-w-[80px]">
              {filteredCurrentSlideIndex + 1} / {slides.length}
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
