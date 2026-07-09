"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  Loader2,
  AlertTriangle,
  Maximize,
  Minimize,
  ChevronsRight,
  ChevronLeft,
  PartyPopper,
} from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@workspace/ui/components/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { compareSlidesByPosition } from "@/lib/fractional-position";
import { certificationApi } from "@/entities/certification/api/endpoints";
import {
  SlideRenderer,
  type SlideData,
} from "@/components/organisms/slide-renderer";
import { usePreloadAllSlideImages } from "@/hooks/use-preload-all-slide-images";
import { createSlug } from "@/utils/slug";
import { cn } from "@workspace/ui/lib/utils";

type ExtendedSlideData = SlideData & {
  signedUrl?: string | null;
};

function CourseTopicSlidesPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const courseNameSlug = params?.course_name as string;
  const topicSlug = params?.topic as string;
  // Read fullscreen query param only once on initial load (non-reactive)
  const initialFullscreenRef = useRef<string | null>(null);
  if (initialFullscreenRef.current === null) {
    initialFullscreenRef.current = searchParams.get("fullscreen");
  }
  const fullscreenParam = initialFullscreenRef.current;
  const [currentSlideId, setCurrentSlideId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(fullscreenParam === "true");
  const [showControls, setShowControls] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [hasQuizzes, setHasQuizzes] = useState<boolean | null>(null);
  const [showLockedDialog, setShowLockedDialog] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [isTopicUnlocked, setIsTopicUnlocked] = useState<boolean | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const redirectCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSlideRef = useRef<string | null>(null);

  // Local state for topic, slides, and attempt
  const [foundTopicId, setFoundTopicId] = useState<string | null>(null);
  const [topic, setTopicState] = useState<any | null>(null);
  const [slides, setSlidesState] = useState<ExtendedSlideData[]>([]);
  const [currentAttempt, setCurrentAttemptState] = useState<any | null>(null);

  // Find current slide by ID
  const currentSlide = currentSlideId
    ? slides.find((s) => s.id === currentSlideId) || null
    : null;
  const currentSlideIndex = currentSlide
    ? slides.findIndex((s) => s.id === currentSlide.id)
    : -1;

  usePageTitle(["courses", courseNameSlug, topicSlug, "slides"]);

  // Set mounted state to prevent hydration errors with Radix components
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Pre-fetch all image URLs in background when topic loads
  // DISABLED: URLs are already included in the API response, so no need to fetch individually
  // usePrefetchCertificationImages(slides, !isLoading && slides.length > 0);
  
  // Preload all slide images into browser cache for instant navigation
  // This uses cached URLs from the API response, so no additional API calls
  usePreloadAllSlideImages(slides, !isLoading && slides.length > 0, true);

  // Single API call to fetch topic, slides, progress, and unlock status
  useEffect(() => {
    const fetchTopicData = async () => {
      if (!courseNameSlug || !topicSlug) {
        setIsLoading(false);
        setError("Course or topic slug missing");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        setIsTopicUnlocked(null);

        // Single API call that returns everything
        const result = await certificationApi.topics.bySlugWithCourse(
          courseNameSlug,
          topicSlug
        );

        // Check for errors (ApiResult has data: null when error)
        if (!result.data) {
          const errorObj = (result as { error: { message: string; status?: number } }).error;
          const errorMessage = errorObj?.message || "Failed to fetch topic";
          setError(errorMessage);
          setIsLoading(false);
          return;
        }

        const { topic: topicData, slides: slidesData, attempt: attemptData, isUnlocked } = result.data;

        // Set unlock status
        setIsTopicUnlocked(isUnlocked);

        if (!isUnlocked) {
          setShowLockedDialog(true);
          setIsLoading(false);
          // Still set topic for display
          setFoundTopicId(topicData.id);
          setTopicState(topicData);
          return;
        }

        // Process slides to match ExtendedSlideData format
        const processedSlides: ExtendedSlideData[] = slidesData
          .sort(compareSlidesByPosition)
          .map((slide) => {
            const slideWithUrl = slide as typeof slide & { signedUrl?: string | null };
            return {
              id: slide.id,
              kind: slide.kind as SlideData["kind"],
              position: slide.position,
              textHtml: slide.textHtml ?? null,
              imageUrl: slide.imageUrl ?? null,
              videoUrl: slide.videoUrl ?? null,
              videoStartS: slide.videoStartS ?? null,
              videoEndS: slide.videoEndS ?? null,
              effectiveNotes: (slide as any).officialNotes ?? null,
              // Preserve signedUrl for image slides
              ...(slide.kind === "image" && slideWithUrl.signedUrl
                ? { signedUrl: slideWithUrl.signedUrl }
                : {}),
            };
          });

        // Set topic and slides in local state
        setFoundTopicId(topicData.id);
        setTopicState(topicData);
        setSlidesState(processedSlides);

        // Set attempt
        if (attemptData) {
          setCurrentAttemptState(attemptData);
        }

        // Reset quiz check
        setHasQuizzes(null);

        setIsLoading(false);
      } catch (err) {
        console.error("Failed to fetch topic data:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch topic data");
        setIsLoading(false);
      }
    };

    fetchTopicData();
  }, [courseNameSlug, topicSlug]);

  // Update current slide on page exit
  const updateCurrentSlideOnExit = useCallback(async () => {
    const currentSlideId = pendingSlideRef.current;
    
    // Check if there's a slide to update
    if (!currentSlideId || !foundTopicId || !topic) {
      return;
    }

    try {
      // Update current slide with a single API call
      const result = await certificationApi.topics.progress.update(topic.id, {
        currentSlideId,
      });

      // Update local state with server response
      if (result.data?.attempt && foundTopicId) {
        setCurrentAttemptState(result.data.attempt);
      }
    } catch (err) {
      console.error("Failed to update current slide on exit:", err);
    }
  }, [foundTopicId, topic]);



  // Determine current slide from attempt when slides/attempt are available (only once)
  useEffect(() => {
    if (!foundTopicId || !slides.length || currentSlideId !== null) return;

    let targetSlideId: string | null = null;

    if (currentAttempt?.currentSlideId) {
      const slide = slides.find((s) => s.id === currentAttempt.currentSlideId);
      if (slide) {
        targetSlideId = slide.id;
      }
    }

    // Default to first slide if nothing found
    if (!targetSlideId && slides.length > 0) {
      targetSlideId = slides[0].id;
    }

    if (targetSlideId) {
      setCurrentSlideId(targetSlideId);
    }
  }, [foundTopicId, slides, currentAttempt, currentSlideId]);

  // Sync pendingSlideRef whenever currentSlideId changes
  useEffect(() => {
    if (currentSlideId) {
      pendingSlideRef.current = currentSlideId;
    }
  }, [currentSlideId]);

  const handleNextSlide = useCallback(async () => {
    // Check if we're on the last slide
    if (currentSlideIndex >= 0 && currentSlideIndex === slides.length - 1) {
      // Exit fullscreen if in fullscreen mode
      if (isFullscreen && document.fullscreenElement) {
        try {
          await document.exitFullscreen();
          setIsFullscreen(false);
          // Remove fullscreen query param
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete("fullscreen");
          router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
        } catch (error) {
          console.error("Error exiting fullscreen:", error);
        }
      }

      // Set finishing state to disable button and show "Finishing..." text
      setIsFinishing(true);

      // Call complete endpoint
      if (currentSlideId && foundTopicId && topic && currentAttempt && currentAttempt.status !== "completed") {
        setIsLoadingQuiz(true);
        
        try {
          const result = await certificationApi.topics.progress.complete(topic.id, {
            currentSlideId,
          });
          
          if (result.data) {
            setCurrentAttemptState(result.data.attempt);
            setHasQuizzes(result.data.hasQuiz);
            setShowCompletionModal(true);
          } else {
            console.error("Failed to complete topic:", result.error);
            setHasQuizzes(false);
            setShowCompletionModal(true);
          }
        } catch (err) {
          console.error("Failed to complete topic:", err);
          setHasQuizzes(false);
          setShowCompletionModal(true);
        } finally {
          setIsLoadingQuiz(false);
          setIsFinishing(false);
        }
      } else {
        setShowCompletionModal(true);
        setIsFinishing(false);
      }
      return;
    }

    // Navigate to next slide
    if (currentSlideIndex >= 0 && currentSlideIndex < slides.length - 1) {
      const nextSlide = slides[currentSlideIndex + 1];
      setCurrentSlideId(nextSlide.id);
    }
  }, [
    currentSlideIndex,
    slides,
    topic,
    currentAttempt,
    currentSlideId,
    foundTopicId,
    isFullscreen,
    router,
  ]);

  const handlePrevSlide = useCallback(() => {
    if (currentSlideIndex > 0) {
      const prevSlide = slides[currentSlideIndex - 1];
      setCurrentSlideId(prevSlide.id);
    }
  }, [currentSlideIndex, slides]);

  // Handle quiz navigation
  const handleTakeQuiz = useCallback(async () => {
    if (!topic || !courseNameSlug) return;

    const topicSlug = createSlug(topic.title);
    router.push(`/courses/${courseNameSlug}/${topicSlug}/quiz`);
  }, [topic, courseNameSlug, router]);

  // Handle "Later" navigation to course homepage
  const handleLater = useCallback(() => {
    if (!courseNameSlug) return;
    router.push(`/courses/${courseNameSlug}`);
  }, [courseNameSlug, router]);

  // Fullscreen functionality (for browser fullscreen API)
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        // Update URL with fullscreen query param
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set("fullscreen", "true");
        router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        // Remove fullscreen query param
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete("fullscreen");
        router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
      }
    } catch (error) {
      console.error("Error toggling fullscreen:", error);
    }
  }, [router]);

  // Fullscreen change detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      // Sync query param with actual fullscreen state
      const currentUrl = new URL(window.location.href);
      if (isNowFullscreen) {
        currentUrl.searchParams.set("fullscreen", "true");
      } else {
        currentUrl.searchParams.delete("fullscreen");
      }
      router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [router]);

  // Sync fullscreen state from query param on mount
  useEffect(() => {
    if (fullscreenParam === "true" && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((error) => {
        console.error("Error entering fullscreen:", error);
      });
    } else if (fullscreenParam !== "true" && document.fullscreenElement) {
      document.exitFullscreen().catch((error) => {
        console.error("Error exiting fullscreen:", error);
      });
    }
  }, [fullscreenParam]);

  // Keyboard navigation
  useEffect(() => {
    if (isLoading || error || !slides.length) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevSlide();
      } else if (e.key === "F4" || e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "Escape" && isFullscreen) {
        e.preventDefault();
        toggleFullscreen();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "t") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleNextSlide,
    handlePrevSlide,
    toggleFullscreen,
    slides.length,
    isLoading,
    error,
    isFullscreen,
  ]);

  // Update date and time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Mouse movement detection for controls (only in fullscreen)
  const showControlsWithTimeout = useCallback(() => {
    if (!isFullscreen) {
      setShowControls(true);
      return;
    }
    setShowControls(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, [isFullscreen]);

  useEffect(() => {
    if (isLoading || error || !slides.length) return;

    if (!isFullscreen) {
      setShowControls(true);
      return;
    }

    const handleMouseMove = () => {
      showControlsWithTimeout();
    };

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
  }, [isLoading, error, slides.length, isFullscreen, showControlsWithTimeout]);

  // Page exit detection - update current slide on browser close or navigation away
  useEffect(() => {
    // Handle beforeunload (browser/tab close)
    const handleBeforeUnload = (_e: BeforeUnloadEvent) => {
      // Update current slide before page unloads
      // Use fetch with keepalive for reliable delivery during page exit
      // Note: sendBeacon doesn't support PATCH method, so we use fetch instead
      const currentSlideId = pendingSlideRef.current;
      if (currentSlideId && foundTopicId && topic) {
        const payload = JSON.stringify({
          currentSlideId,
        });

        const url = `/api/certification/topics/${encodeURIComponent(topic.id)}/progress`;

        // Use fetch with keepalive for reliable delivery during page exit
        // keepalive ensures the request completes even if the page unloads
        fetch(url, {
          method: "PATCH",
          body: payload,
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          credentials: "include", // Ensure cookies are sent
        }).catch(() => {
          // Ignore errors during page unload
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [pathname, courseNameSlug, topicSlug, foundTopicId, topic]);

  // Detect navigation away from slides page and update current slide
  useEffect(() => {
    const slidesPathPattern = `/courses/${courseNameSlug}/${topicSlug}/slides`;
    const isOnSlidesPage = pathname.startsWith(slidesPathPattern);

    // If we're navigating away from slides page, update current slide
    if (!isOnSlidesPage && foundTopicId && topic) {
      updateCurrentSlideOnExit();
    }
  }, [pathname, courseNameSlug, topicSlug, foundTopicId, topic, updateCurrentSlideOnExit]);

  // Cleanup: update current slide on component unmount
  useEffect(() => {
    return () => {
      // Update current slide on unmount
      if (foundTopicId && topic) {
        updateCurrentSlideOnExit();
      }
    };
  }, [foundTopicId, topic, updateCurrentSlideOnExit]);

  // Redirect countdown timer effect
  useEffect(() => {
    // Clear any existing countdown when dialog closes
    if (!showLockedDialog) {
      if (redirectCountdownRef.current) {
        clearInterval(redirectCountdownRef.current);
        redirectCountdownRef.current = null;
      }
      setRedirectCountdown(null);
      return;
    }

    // Start countdown when dialog opens
    setRedirectCountdown(5);

    redirectCountdownRef.current = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev === null || prev <= 1) {
          // Countdown reached 0, stop the timer
          if (redirectCountdownRef.current) {
            clearInterval(redirectCountdownRef.current);
            redirectCountdownRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup on unmount or when dialog closes
    return () => {
      if (redirectCountdownRef.current) {
        clearInterval(redirectCountdownRef.current);
        redirectCountdownRef.current = null;
      }
    };
  }, [showLockedDialog]);

  // Handle automatic redirect when countdown reaches 0
  useEffect(() => {
    if (redirectCountdown === 0 && showLockedDialog && courseNameSlug) {
      setIsRedirecting(true);
      router.push(`/courses/${courseNameSlug}`);
    }
  }, [redirectCountdown, showLockedDialog, courseNameSlug, router]);

  // Show loading while fetching data
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If topic is locked, don't render slides - dialog will handle it
  if (isTopicUnlocked === false) {
    return (
      <>
        {/* Locked Topic Dialog */}
        <Dialog open={showLockedDialog} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md" showCloseButton={false}>
            <DialogHeader>
              <div className="flex flex-col items-center gap-4 mb-4">
                <div className="rounded-full bg-destructive/10 p-3">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <DialogTitle className="text-2xl text-center">
                  Topic Locked
                </DialogTitle>
                <DialogDescription className="text-center text-base">
                  You haven&apos;t unlocked these slides yet!
                </DialogDescription>
              </div>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-4">
              <Button
                onClick={() => {
                  // Clear countdown timer
                  if (redirectCountdownRef.current) {
                    clearInterval(redirectCountdownRef.current);
                    redirectCountdownRef.current = null;
                  }
                  setRedirectCountdown(null);
                  // Redirect immediately
                  setIsRedirecting(true);
                  router.push(`/courses/${courseNameSlug}`);
                }}
                disabled={isRedirecting}
                className="w-full"
                size="lg"
              >
                {isRedirecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : redirectCountdown !== null && redirectCountdown > 0 ? (
                  `Back to Course (${redirectCountdown})`
                ) : (
                  "Back to Course"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Show error if fetch failed
  if (error || !topic) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              {error ?? "Topic not found"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canGoPrev = currentSlideIndex > 0;
  const isLastSlide = currentSlideIndex >= 0 && currentSlideIndex === slides.length - 1;

  return (
    <div
      className={cn(
        "relative w-full h-full flex items-center justify-center overflow-hidden px-0",
        isFullscreen && "fixed inset-0 z-50",
        isFullscreen && !showControls && "cursor-none"
      )}
      onMouseMove={isFullscreen ? showControlsWithTimeout : undefined}
    >
      {isFullscreen ? (
        <>
          {/* Fullscreen: Overlay header - appears when controls are visible */}
          <div
            className={cn(
              "absolute top-0 left-0 right-0 transition-all duration-300 ease-in-out z-50 px-0",
              showControls
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-4 pointer-events-none"
            )}
          >
            <div className="absolute left-1/2 top-0 -translate-x-1/2 flex items-center gap-2">
              {/* Topic title - separate tab */}
              <div className="px-6 py-3 h-12 bg-background border border-border rounded-b-lg shadow-sm flex items-center gap-4">
                <p className="text-foreground text-sm font-medium">
                  {topic.title}
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

              {/* Fullscreen button - separate tab */}
              <div className="px-6 py-3 h-12 bg-background border border-border rounded-b-lg shadow-sm flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="text-foreground hover:bg-foreground/20 flex items-center gap-2"
                >
                  <Minimize className="h-4 w-4" />
                  <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    Esc
                  </kbd>
                  <span className="text-sm">Exit Fullscreen</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Fullscreen: Main slide display */}
          <div className="w-screen h-screen flex items-center justify-center relative">
            {slides.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    No slides available for this topic.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="relative bg-muted overflow-hidden w-full h-full rounded-none">
                {slides.map((slide) => (
                  <div
                    key={slide.id}
                    className={cn(
                      "absolute inset-0 transition-opacity duration-300",
                      currentSlideId === slide.id
                        ? "opacity-100 z-10"
                        : "opacity-0 z-0 pointer-events-none"
                    )}
                  >
                    <SlideRenderer
                      slide={slide}
                      className="w-full h-full"
                      isCertification={true}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen: Overlay bottom controls - appears when controls are visible */}
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
                  onClick={handlePrevSlide}
                  disabled={!canGoPrev}
                  className="text-foreground hover:bg-foreground/20 disabled:opacity-50 flex items-center gap-2"
                >
                  <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    ←
                  </kbd>
                  <span className="text-sm">Previous</span>
                </Button>

                <div className="text-foreground text-sm font-medium text-center min-w-[80px]">
                  {currentSlideIndex >= 0 ? currentSlideIndex + 1 : 0} / {slides.length}
                </div>

                <div className="relative flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextSlide}
                    disabled={isFinishing}
                    className={cn(
                      "text-foreground hover:bg-foreground/20 flex items-center gap-2",
                      isFinishing && "animate-pulse"
                    )}
                  >
                    <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                      →
                    </kbd>
                    <span className="text-sm">{isFinishing ? "Finishing..." : isLastSlide ? "Finish" : "Next"}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Non-fullscreen: Card layout with header and footer */}
          <Card className="w-full max-w-5xl mx-auto overflow-hidden bg-muted">
            {/* Header - always visible, tight spacing */}
            <div className="px-6 py-0 flex items-center justify-between h-auto min-h-[60px]">
              <div className="flex flex-col gap-1 h-full justify-center flex-[0.6] min-w-0">
                {/* Topic title with badge */}
                <div className="flex items-center gap-2 min-w-0">
                  {topic.courseOrder !== null && topic.courseOrder !== undefined && (
                    <Badge
                      variant="secondary"
                      className="text-xs font-bold border-0 py-0 px-1.5 h-5 rounded-sm flex-shrink-0"
                    >
                      T{topic.courseOrder}
                    </Badge>
                  )}
                  {isMounted ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-foreground text-2xl font-semibold truncate min-w-0">
                          {topic.title}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{topic.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <p className="text-foreground text-2xl font-semibold truncate min-w-0">
                      {topic.title}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-foreground hover:bg-foreground/20 flex items-center gap-2 h-full flex-shrink-0"
              >
                <Maximize className="h-4 w-4" />
                <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  F4
                </kbd>
                <span className="text-base">Fullscreen</span>
              </Button>
            </div>

            {/* Slide display - full width, no side padding, no gap */}
            <CardContent className="p-0">
              {slides.length === 0 ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <p className="text-sm text-muted-foreground">
                    No slides available for this topic.
                  </p>
                </div>
              ) : (
                <div className="relative bg-muted overflow-hidden aspect-video w-full">
                  {slides.map((slide) => (
                    <div
                      key={slide.id}
                      className={cn(
                        "absolute inset-0 transition-opacity duration-300",
                        currentSlideId === slide.id
                          ? "opacity-100 z-10"
                          : "opacity-0 z-0 pointer-events-none"
                      )}
                    >
                      <SlideRenderer
                        slide={slide}
                        className="w-full h-full"
                        isCertification={true}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            {/* Footer - always visible with controls, tight spacing */}
            <div className="px-6 py-0 flex items-center justify-center">
              <div className="flex items-center gap-4 h-full">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevSlide}
                  disabled={!canGoPrev}
                  className="text-foreground hover:bg-foreground/20 disabled:opacity-50 flex items-center gap-2 h-full"
                >
                  <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    ←
                  </kbd>
                  <span className="text-base">Previous</span>
                </Button>

                <div className="text-foreground text-base font-medium text-center min-w-[80px]">
                  {currentSlideIndex >= 0 ? currentSlideIndex + 1 : 0} / {slides.length}
                </div>

                <div className="relative flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextSlide}
                    disabled={isFinishing}
                    className={cn(
                      "text-foreground hover:bg-foreground/20 flex items-center gap-2 h-full",
                      isFinishing && "animate-pulse"
                    )}
                  >
                    <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                      →
                    </kbd>
                    <span className="text-base">{isFinishing ? "Finishing..." : isLastSlide ? "Finish" : "Next"}</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Locked Topic Dialog */}
      {isMounted && (
        <Dialog open={showLockedDialog} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <div className="flex flex-col items-center gap-4 mb-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <DialogTitle className="text-2xl text-center">
                Topic Locked
              </DialogTitle>
              <DialogDescription className="text-center text-base">
                You haven&apos;t unlocked these slides yet?
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => {
                // Clear countdown timer
                if (redirectCountdownRef.current) {
                  clearInterval(redirectCountdownRef.current);
                  redirectCountdownRef.current = null;
                }
                setRedirectCountdown(null);
                // Redirect immediately
                setIsRedirecting(true);
                router.push(`/courses/${courseNameSlug}`);
              }}
              disabled={isRedirecting}
              className="w-full"
              size="lg"
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting...
                </>
              ) : redirectCountdown !== null && redirectCountdown > 0 ? (
                `Back to Course (${redirectCountdown})`
              ) : (
                "Back to Course"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Completion Modal */}
      {isMounted && (
        <Dialog 
          open={showCompletionModal} 
          onOpenChange={(open) => {
            setShowCompletionModal(open);
            if (!open) {
              setIsFinishing(false);
              // Navigate to course page when completion modal closes
              if (courseNameSlug) {
                router.push(`/courses/${courseNameSlug}`);
              }
            }
          }}
        >
          <DialogContent className="sm:max-w-xs" showCloseButton={false}>
          <DialogHeader>
            <div className="flex flex-col items-center gap-4 mb-4">
              <div className="rounded-full bg-[var(--brand-bullyproof-primary)]/10 p-3">
                <PartyPopper className="h-8 w-8 text-[var(--brand-bullyproof-primary)]" />
              </div>
              <DialogTitle className="text-2xl text-center text-[var(--brand-bullyproof-primary)]">
                Congratulations!
              </DialogTitle>
              <DialogDescription className="text-center text-base">
                {hasQuizzes === null
                  ? isLoadingQuiz
                    ? "Checking for quizzes..."
                    : "You finished this topic!"
                  : hasQuizzes
                  ? "You finished this topic. Would you like to take the quiz now?"
                  : "You finished this topic!"}
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            {hasQuizzes === true && (
              <Button
                onClick={handleTakeQuiz}
                disabled={isLoadingQuiz}
                size="lg"
                className="w-full bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90 hover:text-white gap-1"
              >
                {isLoadingQuiz ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Take Quiz
                    <ChevronsRight className="h-4 w-4" style={{ animation: "bounce-right-subtle 1s ease-in-out infinite" }} />
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={handleLater}
              variant={hasQuizzes === true ? "ghost" : "default"}
              size="lg"
              className={cn(
                "w-full gap-1",
                hasQuizzes === false && "bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90 hover:text-white"
              )}
              disabled={isLoadingQuiz}
            >
              {hasQuizzes === true ? (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  Course Home
                </>
              ) : (
                <>
                  Return to Course
                  <ChevronsRight className="h-4 w-4" style={{ animation: "bounce-right-subtle 1s ease-in-out infinite" }} />
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}

export default function CourseTopicSlidesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CourseTopicSlidesPageContent />
    </Suspense>
  );
}
