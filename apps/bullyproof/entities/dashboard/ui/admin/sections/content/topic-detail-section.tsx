"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";
import { topicsApi } from "@/entities/topics/api/endpoints";
import type { topics, topicSlides } from "@/server/db/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Loader2,
  ArrowLeft,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import {
  SlideRenderer,
  type SlideData,
} from "@/components/organisms/slide-renderer";

type Topic = typeof topics.$inferSelect & {
  stage?: any;
  slides?: Array<typeof topicSlides.$inferSelect>;
};

interface TopicDetailSectionProps {
  stageSlug: string;
  topicSlug: string;
}

export function TopicDetailSection({
  stageSlug,
  topicSlug,
}: TopicDetailSectionProps) {
  const router = useRouter();
  const [stage, setStage] = useState<any | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Parse topic slug (e.g., "T1" -> order 1)
  const topicOrder = topicSlug.startsWith("T")
    ? parseInt(topicSlug.substring(1), 10)
    : null;

  useEffect(() => {
    if (!stageSlug || !topicOrder) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch stage
        const stageResult = await curriculumApi.stages.byCode(stageSlug);
        if (!stageResult.data) {
          setError(
            stageResult.error?.message ?? "Failed to fetch curriculum stage"
          );
          return;
        }
        setStage(stageResult.data);

        // Fetch topics for this stage
        const topicsResult = await topicsApi.get.list({
          stageId: stageResult.data.id,
        });
        if (!topicsResult.data) {
          setError(topicsResult.error?.message ?? "Failed to fetch topics");
          return;
        }

        // Find topic by stageOrder
        // URL format is T1, T2, etc., so we match stageOrder exactly
        // (stageOrder is typically 1-indexed based on display)
        const foundTopic = topicsResult.data.find(
          (t) => t.stageOrder === topicOrder
        );

        if (!foundTopic) {
          setError(`Topic with order ${topicOrder} not found`);
          return;
        }

        // Fetch full topic details with slides
        const topicResult = await topicsApi.get.byId(foundTopic.id);
        if (topicResult.data) {
          setTopic(topicResult.data);
        } else {
          setError(
            topicResult.error?.message ?? "Failed to fetch topic details"
          );
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

    fetchData();
  }, [stageSlug, topicOrder]);

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
    if (isLoading || error || slides.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, error, slides.length, goToPrevious, goToNext]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading topic...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/admin/content/curriculum/${stageSlug}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stage
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p className="font-medium">Error loading topic</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/admin/content/curriculum/${stageSlug}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stage
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p className="font-medium">Topic not found</p>
              <p className="text-sm mt-2">
                The topic you're looking for doesn't exist.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      {/* <Button
        variant="ghost"
        onClick={() => router.push(`/admin/content/curriculum/${stageSlug}`)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Stage
      </Button> */}

      {/* Topic Header */}
      <div className="flex items-center justify-between">
        <div className=" flex items-center justify-start gap-8">
          <div className="flex items-center gap-2">
            <FileText className="text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">{topic.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {stage && <Badge variant="secondary">{stage.name}</Badge>}
            {topic.stageOrder !== null && (
              <Badge variant="outline">Topic {topic.stageOrder}</Badge>
            )}
            {topic.status && (
              <Badge
                className="capitalize"
                variant={
                  topic.status === "published"
                    ? "default"
                    : topic.status === "draft"
                      ? "secondary"
                      : "outline"
                }
              >
                {topic.status}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline">Preview</Button>
          <Button variant="outline">Save Changes</Button>
        </div>
      </div>

      {/* Slides Section */}
      {slides.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">No slides available</p>
              <p className="text-sm mt-2">
                This topic doesn't have any slides yet.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : currentSlide ? (
        <div className="space-y-6">
          {/* First Row: Current Slide Preview (3/5) + Slide Info (2/5) */}
          <div className="grid grid-cols-5 gap-6">
            {/* Current Slide Preview - 3/5 width */}
            <div className="col-span-3">
              <SlideRenderer slide={currentSlide} className="w-full h-full" />
            </div>

            {/* Slide Information Panel - 2/5 width */}
            <div className="col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Slide Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Slide {currentSlideIndex + 1} of {slides.length}
                    </p>
                    <p className="text-2xl font-semibold">
                      Slide {currentSlide.orderIndex + 1}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Type
                    </p>
                    <Badge variant="secondary" className="capitalize">
                      {currentSlide.kind}
                    </Badge>
                  </div>

                  {currentSlide.effectiveNotes && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Notes
                      </p>
                      <p className="text-sm text-foreground bg-muted/50 p-3 rounded-md">
                        {currentSlide.effectiveNotes}
                      </p>
                    </div>
                  )}

                  {/* Navigation Controls */}
                  {slides.length > 1 && (
                    <div className="space-y-2 pt-4 border-t">
                      <p className="text-sm font-medium text-muted-foreground">
                        Navigation
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPrevious}
                          disabled={!canGoPrev}
                          className="flex-1"
                        >
                          <ChevronLeft className="h-4 w-4 mr-2" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNext}
                          disabled={!canGoNext}
                          className="flex-1"
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Second Row: Slide Gallery (Canva-style) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Slides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentSlideIndex(index)}
                    className={`
                      flex-shrink-0 relative group cursor-pointer transition-all rounded-lg
                      ${
                        index === currentSlideIndex
                          ? "ring-2 ring-primary ring-offset-2 scale-105"
                          : "opacity-70 hover:opacity-100 hover:scale-[1.02]"
                      }
                    `}
                    style={{
                      width: "180px",
                      aspectRatio: "16 / 9",
                    }}
                  >
                    <div className="w-full h-full bg-muted/30 rounded-lg p-1.5 border-2 border-border overflow-hidden flex items-center justify-center">
                      <div className="w-full h-full min-w-0 min-h-0">
                        <SlideRenderer
                          slide={slide}
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                    <div
                      className={`
                        absolute bottom-1.5 left-1.5 right-1.5 text-center text-xs font-medium py-1 px-2 rounded
                        ${
                          index === currentSlideIndex
                            ? "bg-primary text-primary-foreground"
                            : "bg-background/90 text-foreground backdrop-blur-sm"
                        }
                      `}
                    >
                      Slide {slide.orderIndex + 1}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
