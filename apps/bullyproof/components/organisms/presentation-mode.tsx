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
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { SlideRenderer } from "./slide-renderer";
import { useLessonLiveState } from "@/hooks/use-lesson-live-state";

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
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const nextSlide = useCallback(() => {
    if (currentSlideIndex < slides.length - 1) {
      updateSlide(currentSlideIndex + 1);
    }
  }, [currentSlideIndex, slides.length, updateSlide]);

  const prevSlide = useCallback(() => {
    if (currentSlideIndex > 0) {
      updateSlide(currentSlideIndex - 1);
    }
  }, [currentSlideIndex, updateSlide]);

  // All hooks must be called before any conditional returns
  // Keyboard navigation
  useEffect(() => {
    if (isLoading || error || !slides.length || !currentSlide) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        prevSlide();
      } else if (e.key === "Escape") {
        // Exit presentation mode
        router.back();
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
    if (isLoading || error || !slides.length || !currentSlide) return;

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
  }, [isLoading, error, slides.length, currentSlide]);

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
  if (!slides.length || !currentSlide) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>No slides available</p>
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
              disabled={currentSlideIndex === 0}
              className="text-foreground hover:bg-foreground/20 disabled:opacity-50"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={nextSlide}
              disabled={currentSlideIndex === slides.length - 1}
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
              onClick={() => router.back()}
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
