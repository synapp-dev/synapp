"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";
import { topicsApi } from "@/entities/topics/api/endpoints";
import type { topics } from "@/server/db/schema";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  MessageCircleQuestion,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@workspace/ui/components/tooltip";
import {
  SlideRenderer,
  type SlideData,
} from "@/components/organisms/slide-renderer";
import { useTopicSlidesCacheStore } from "@/stores/topic-slides-cache-store";
import { Separator } from "@workspace/ui/components/separator";

type Topic = typeof topics.$inferSelect;

type SlideDataWithQuiz = SlideData & {
  quizData?: {
    question: string;
    answers: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
    }>;
  } | null;
};

interface TopicDetailSectionProps {
  stageSlug: string;
  topicSlug: string;
  schoolId: string;
}

export function TopicDetailSection({
  stageSlug,
  topicSlug,
  schoolId,
}: TopicDetailSectionProps) {
  const router = useRouter();
  const [stage, setStage] = useState<any | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slides, setSlides] = useState<SlideDataWithQuiz[]>([]);
  const galleryRef = useRef<HTMLDivElement>(null);

  // Parse topic order from slug (format: T{stageOrder})
  const topicOrder = topicSlug?.startsWith("T")
    ? parseInt(topicSlug.substring(1), 10)
    : null;

  const invalidateSlide = useTopicSlidesCacheStore(
    (state) => state.invalidateSlide
  );

  const fetchTopicData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!stageSlug || !topicOrder) return;

      const stageResult = await curriculumApi.stages.byCode(stageSlug);
      if (!stageResult.data) {
        setError(
          stageResult.error?.message ?? "Failed to fetch curriculum stage"
        );
        return;
      }
      setStage(stageResult.data);

      const topicsResult = await topicsApi.get.list({
        stageId: stageResult.data.id,
      });
      if (!topicsResult.data) {
        setError(topicsResult.error?.message ?? "Failed to fetch topics");
        return;
      }

      const foundTopic = topicsResult.data.find(
        (t) => t.stageOrder === topicOrder
      );

      if (!foundTopic) {
        setError(`Topic with order ${topicOrder} not found`);
        return;
      }

      const topicResult = await topicsApi.get.byId(foundTopic.id);
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

        // Invalidate all slide caches to force refresh
        initialSlides.forEach((slide) => {
          invalidateSlide(slide.id);
        });
      } else {
        setError(topicResult.error?.message ?? "Failed to fetch topic details");
      }
    } catch (err) {
      console.error("Failed to fetch topic:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch topic details"
      );
    } finally {
      setIsLoading(false);
    }
  }, [stageSlug, topicOrder, invalidateSlide]);

  useEffect(() => {
    fetchTopicData();
  }, [fetchTopicData]);

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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={() =>
                router.push(`/schools/${schoolId}/content/${stageSlug}`)
              }
              className="mb-4"
            >
              <ChevronsLeft className="h-4 w-4 mr-2" />
              Stages
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Go back to stages</p>
          </TooltipContent>
        </Tooltip>
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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={() =>
                router.push(`/schools/${schoolId}/content/${stageSlug}`)
              }
              className="mb-4"
            >
              <ChevronsLeft className="h-4 w-4 mr-2" />
              Stages
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Go back to stages</p>
          </TooltipContent>
        </Tooltip>
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
      {/* Topic Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-start gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={() =>
                  router.push(`/schools/${schoolId}/content/${stageSlug}`)
                }
                className=""
              >
                <ChevronsLeft className="h-4 w-4" />
                Stages
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Go back to stages</p>
            </TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-2">
            <FileText className="text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">{topic.title}</h1>
          </div>
          <Separator orientation="vertical" className="h-4" />
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
              {currentSlide.kind === "quiz" ? (
                <div className="relative w-full h-full rounded-lg shadow-lg overflow-hidden bg-background p-8 flex flex-col">
                  {/* Bullyproof Logo - Top Center */}
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                    <Image
                      src="/images/bullyproof-logo.svg"
                      alt="Bullyproof"
                      width={168}
                      height={45}
                      className="h-11 w-auto"
                    />
                  </div>
                  <div className="flex flex-col h-full justify-center space-y-4 pt-4">
                    {/* Question - Centered and Bold */}
                    <div className="text-center">
                      <h2 className="text-2xl font-bold">
                        {currentSlide.quizData?.question || "Question"}
                      </h2>
                    </div>
                    {/* Answers - Single Column Grid */}
                    <div className="flex justify-center">
                      <div className="w-full max-w-md space-y-2">
                        {currentSlide.quizData?.answers.map(
                          (answer: any, index: number) => (
                            <div
                              key={answer.id || index}
                              className="flex items-center space-x-3 p-3 border rounded-md bg-card"
                            >
                              <div className="flex-1">
                                {answer.text || `Answer ${index + 1}`}
                              </div>
                              {answer.isCorrect && (
                                <Badge
                                  variant="default"
                                  className="bg-green-500"
                                >
                                  Correct
                                </Badge>
                              )}
                            </div>
                          )
                        ) || []}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <SlideRenderer
                  key={currentSlide.id}
                  slide={currentSlide}
                  className="w-full h-full"
                />
              )}
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
                    {slide.kind === "quiz" ? (
                      <div className="w-full h-full flex items-center justify-center bg-muted pb-4">
                        <div className="flex items-center gap-2">
                          <MessageCircleQuestion className="h-6 w-6 text-muted-foreground" />
                          <span className="text-base font-medium text-muted-foreground">
                            Quiz
                          </span>
                        </div>
                      </div>
                    ) : (
                      <SlideRenderer
                        slide={slide}
                        className="w-full h-full"
                        thumbnailOnly={true}
                      />
                    )}
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
