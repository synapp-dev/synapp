"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { topicsApi } from "@/entities/topics/api/endpoints";
import type { topics, topicSlides } from "@/server/db/schema";
import { SlideRenderer, type SlideData } from "@/components/organisms/slide-renderer";

type Topic = typeof topics.$inferSelect & {
  stage?: any;
  slides?: Array<typeof topicSlides.$inferSelect>;
};

interface TopicPreviewDialogProps {
  topicId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TopicPreviewDialog({
  topicId,
  open,
  onOpenChange,
}: TopicPreviewDialogProps) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    if (!open || !topicId) {
      setTopic(null);
      setError(null);
      setCurrentSlideIndex(0);
      return;
    }

    const fetchTopic = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await topicsApi.get.byId(topicId);
        if (result.data) {
          setTopic(result.data);
          setCurrentSlideIndex(0);
        } else if (result.error) {
          setError(result.error.message ?? "Failed to fetch topic");
        }
      } catch (err) {
        console.error("Failed to fetch topic:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch topic details"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopic();
  }, [open, topicId]);

  const slides: SlideData[] =
    topic?.slides
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
        effectiveNotes: slide.officialNotes ?? null,
      })) ?? [];

  const currentSlide = slides[currentSlideIndex];
  const canGoPrev = currentSlideIndex > 0;
  const canGoNext = currentSlideIndex < slides.length - 1;

  const goToPrevious = useCallback(() => {
    if (canGoPrev) {
      setCurrentSlideIndex((prev) => prev - 1);
    }
  }, [canGoPrev]);

  const goToNext = useCallback(() => {
    if (canGoNext) {
      setCurrentSlideIndex((prev) => prev + 1);
    }
  }, [canGoNext]);

  // Keyboard navigation
  useEffect(() => {
    if (!open || isLoading || error || slides.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isLoading, error, slides.length, goToPrevious, goToNext, onOpenChange]);

  return (
    <Dialog open={open && topicId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            {topic?.title || "Topic Preview"}
          </DialogTitle>
          <DialogDescription>
            {topic?.stage?.name || "Loading..."}
            {slides.length > 0 && (
              <span className="ml-2">
                • Slide {currentSlideIndex + 1} of {slides.length}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex items-center justify-center p-6 min-h-0">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading slides...</p>
            </div>
          ) : error ? (
            <div className="text-center text-destructive">
              <p className="font-medium">Error loading slides</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
            </div>
          ) : slides.length === 0 ? (
            <div className="text-center text-muted-foreground">
              <p className="font-medium">No slides available</p>
              <p className="text-sm mt-2">
                This topic doesn't have any slides yet.
              </p>
            </div>
          ) : currentSlide ? (
            <div className="w-full h-full flex items-center justify-center relative">
              {/* 16:9 aspect ratio container */}
              <div
                className="w-full flex items-center justify-center"
                style={{
                  width: "min(100%, calc((100vh - 200px) * 16 / 9))",
                  height: "min(calc(100vw * 9 / 16), calc(100vh - 200px))",
                  aspectRatio: "16 / 9",
                }}
              >
                <SlideRenderer slide={currentSlide} className="w-full h-full" />
              </div>

              {/* Navigation buttons */}
              {slides.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToPrevious}
                    disabled={!canGoPrev}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous slide</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToNext}
                    disabled={!canGoNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Next slide</span>
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </div>

        {/* Slide counter footer */}
        {slides.length > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlideIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentSlideIndex
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

