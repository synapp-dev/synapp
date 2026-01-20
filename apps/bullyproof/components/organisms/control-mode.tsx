"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { ChevronLeft, ChevronRight, Presentation } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { SlideRenderer } from "./slide-renderer";
import { useLessonLiveState } from "@/hooks/use-lesson-live-state";

interface ControlModeProps {
  lessonId: string;
}

export function ControlMode({ lessonId }: ControlModeProps) {
  const router = useRouter();
  const { slides, currentSlideIndex, currentSlide, updateSlide, isLoading, error } = useLessonLiveState(lessonId);

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

  const goToSlide = useCallback(
    (index: number) => {
      if (index >= 0 && index < slides.length) {
        updateSlide(index);
      }
    },
    [slides.length, updateSlide]
  );

  // All hooks must be called before any conditional returns
  // Keyboard navigation
  useEffect(() => {
    if (isLoading || error || !slides.length || !currentSlide) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        prevSlide();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide, isLoading, error, slides.length, currentSlide]);

  // Now we can have conditional returns after all hooks
  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Loading slides...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full overflow-hidden items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  // Early return if no slides
  if (!slides.length || !currentSlide) {
    return (
      <div className="flex flex-col h-full overflow-hidden items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>No slides available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with mode switcher */}
      <div className="flex-shrink-0 flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Run Lesson</h1>
          <p className="text-muted-foreground">
            Control mode - View slides and notes simultaneously
          </p>
        </div>
        {/* <Button
          variant="outline"
          onClick={() => {
            const currentPath = window.location.pathname;
            const newPath = currentPath.replace("/controls", "/present");
            router.push(newPath);
          }}
        >
          <Presentation className="h-4 w-4 mr-2" />
          Switch to Presentation Mode
        </Button> */}
      </div>

      {/* Slides section - Top */}
      <Card className="flex-1 min-h-0 flex flex-col mb-6">
        <CardHeader className="flex-shrink-0 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Slide {currentSlideIndex + 1} of {slides.length}</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={prevSlide}
                disabled={currentSlideIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={nextSlide}
                disabled={currentSlideIndex === slides.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex items-center justify-center bg-muted/30 rounded-lg p-8 overflow-hidden">
          <div className="w-full h-full flex items-center justify-center">
            <div
              key={currentSlide.id}
              className="w-full h-full animate-in fade-in duration-300"
            >
              <SlideRenderer
                slide={currentSlide}
                className="w-full h-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teacher Notes section - Bottom */}
      <Card className="flex-shrink-0 h-64 flex flex-col mb-6">
        <CardHeader className="flex-shrink-0 pb-3">
          <CardTitle>Teacher Notes</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div
              key={currentSlide.id}
              className="prose prose-sm max-w-none dark:prose-invert animate-in fade-in duration-200"
            >
              {currentSlide.effectiveNotes ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: currentSlide.effectiveNotes,
                  }}
                />
              ) : (
                <p className="text-muted-foreground italic">
                  No notes available for this slide.
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Slide thumbnails navigation - Bottom */}
      <div className="flex-shrink-0 flex gap-2 overflow-x-auto pb-2">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            onClick={() => goToSlide(index)}
            className={cn(
              "flex-shrink-0 w-32 h-20 rounded-lg border-2 transition-all duration-200",
              currentSlideIndex === index
                ? "border-primary ring-2 ring-primary/20 scale-105"
                : "border-border hover:border-primary/50 hover:scale-[1.02]"
            )}
          >
            <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded-lg p-2">
              <span className="text-xs font-medium text-muted-foreground">
                Slide {index + 1}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

