"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PlatformAdminGuard } from "@/components/molecules/platform-admin-guard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { BookOpen, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useLessonById } from "@/entities/lessons/api/useLessonById";
import { topicsApi } from "@/entities/topics/api/endpoints";
import { useParams } from "next/navigation";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  SlideRenderer,
  type SlideData,
} from "@/components/organisms/slide-renderer";
import { useTopicSlidesCacheStore } from "@/stores/topic-slides-cache-store";
import type { topics } from "@/server/db/schema";

type Topic = typeof topics.$inferSelect & { slides?: any[] };

export default function LessonPreparePage() {
  usePageTitle(["schools", "lessons", "prepare"]);
  const params = useParams();
  const lesson_id = params?.lesson_id as string;
  const school_id = params?.school_id as string;

  const {
    data: lessonData,
    isLoading: lessonLoading,
    isError: lessonError,
    error: lessonErrorData,
  } = useLessonById(lesson_id);

  const [showPreview, setShowPreview] = useState(false);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [isLoadingTopic, setIsLoadingTopic] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const galleryRef = useRef<HTMLDivElement>(null);

  const invalidateSlide = useTopicSlidesCacheStore(
    (state) => state.invalidateSlide
  );

  const fetchTopicData = useCallback(async () => {
    if (!lessonData?.topicId) return;

    try {
      setIsLoadingTopic(true);
      setTopicError(null);

      const topicResult = await topicsApi.get.byId(lessonData.topicId);
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
            })) ?? [];
        setSlides(initialSlides);
        setCurrentSlideIndex(0);

        // Invalidate all slide caches to force refresh
        initialSlides.forEach((slide) => {
          invalidateSlide(slide.id);
        });
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
  }, [lessonData?.topicId, invalidateSlide]);

  useEffect(() => {
    if (showPreview && lessonData?.topicId) {
      fetchTopicData();
    }
  }, [showPreview, lessonData?.topicId, fetchTopicData]);

  // Scroll gallery to show current slide
  useEffect(() => {
    if (galleryRef.current && slides.length > 0) {
      const slideElement = galleryRef.current.children[
        currentSlideIndex
      ] as HTMLElement;
      if (slideElement) {
        slideElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [currentSlideIndex, slides.length]);

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

  if (showPreview) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setShowPreview(false)}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">
            {lessonData.topic?.title || "Lesson Preview"}
          </h1>
        </div>

        {/* Preview Content */}
        {isLoadingTopic ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading slides...</p>
            </div>
          </div>
        ) : topicError ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-destructive">
                <p className="font-medium">Error loading slides</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {topicError}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : slides.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <p className="font-medium">No slides available</p>
                <p className="text-sm mt-2">
                  This lesson doesn't have any slides yet.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : currentSlide ? (
          <div className="grid grid-cols-4 gap-6">
            {/* Left Side - Current Slide Preview */}
            <div className="col-span-3 space-y-4">
              {/* Preview Title Bar */}
              <div className="flex items-center justify-center py-2 px-4 bg-muted/50 rounded-t-lg border-b">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Preview Only
                </span>
              </div>
              {/* Current Slide */}
              <div className="relative w-full aspect-video">
                <SlideRenderer
                  key={currentSlide.id}
                  slide={currentSlide}
                  className="w-full h-full"
                />
              </div>

              {/* Navigation Controls */}
              {slides.length > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevious}
                    disabled={!canGoPrev}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  <div className="text-sm text-muted-foreground px-4">
                    Slide {currentSlideIndex + 1} of {slides.length}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNext}
                    disabled={!canGoNext}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>

            {/* Right Side - Slide Gallery */}
            <div className="col-span-1">
              <div
                ref={galleryRef}
                className="flex flex-col gap-4 overflow-y-auto overflow-x-visible py-3 px-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent h-[calc(100vh-300px)]"
              >
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentSlideIndex(index)}
                    className={`
                      flex-shrink-0 relative group transition-all rounded-lg overflow-hidden shadow-lg bg-background cursor-pointer
                      ${
                        index === currentSlideIndex
                          ? "ring-2 ring-primary ring-offset-2 scale-105"
                          : "opacity-70 hover:opacity-100 hover:scale-[1.02]"
                      }
                    `}
                    style={{
                      width: "100%",
                      aspectRatio: "16 / 9",
                    }}
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
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <PlatformAdminGuard />
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Prepare Lesson</h1>
        <p className="text-muted-foreground">
          Get ready for your lesson. Review materials, check resources, and
          prepare for delivery.
        </p>
      </div>

      {/* Lesson Card */}
      <Card
        className="cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setShowPreview(true)}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {lessonData.topic?.title || "Lesson"}
          </CardTitle>
          <CardDescription>
            Click to preview lesson content and slides
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {lessonData.topic?.title
                ? `Topic: ${lessonData.topic.title}`
                : "No topic assigned"}
            </p>
            <p className="text-sm text-muted-foreground">
              Click this card to view the lesson slides in preview mode.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
