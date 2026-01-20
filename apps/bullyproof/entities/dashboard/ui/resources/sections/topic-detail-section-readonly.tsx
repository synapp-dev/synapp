"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Loader2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  SlideRenderer,
  type SlideData,
} from "@/components/organisms/slide-renderer";
import { Separator } from "@workspace/ui/components/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  useTopicsByStage,
  useSlideUrl,
} from "@/entities/topics/model/store-enhanced";
import { useStageByCode } from "@/entities/stages/model/store";
import type { topics, topicSlides } from "@/server/db/schema";

type Topic = typeof topics.$inferSelect & {
  stage?: any;
  slides?: Array<typeof topicSlides.$inferSelect & { signedUrl?: string | null }>;
};

interface TopicDetailSectionReadonlyProps {
  stageSlug: string;
  topicSlug: string;
  schoolId: string;
}

export function TopicDetailSectionReadonly({
  stageSlug,
  topicSlug,
  schoolId,
}: TopicDetailSectionReadonlyProps) {
  const router = useRouter();
  const [stage, setStage] = useState<any | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const slideGalleryRef = useRef<HTMLDivElement>(null);

  // Extract stageOrder from topicSlug (format: "T1", "T2", etc.)
  const stageOrder = topicSlug.startsWith("T")
    ? parseInt(topicSlug.substring(1))
    : null;

  const {
    stage: fetchedStage,
    isLoading: isLoadingStage,
    error: stageError,
  } = useStageByCode(stageSlug);

  const {
    topics: fetchedTopics,
    isLoading: isLoadingTopics,
  } = useTopicsByStage(fetchedStage?.id, {
    includeSlides: true,
    includeUrls: true,
  });

  useEffect(() => {
    if (fetchedStage) {
      setStage(fetchedStage);
    }
  }, [fetchedStage]);

  useEffect(() => {
    // Wait for queries to complete before checking for data
    if (isLoadingStage || isLoadingTopics) {
      setIsLoading(true);
      return;
    }

    // Only check for data after loading completes
    if (fetchedTopics && stageOrder !== null) {
      const foundTopic = fetchedTopics.find(
        (t) => t.stageOrder === stageOrder
      );
      if (foundTopic) {
        setTopic(foundTopic as Topic);
        setIsLoading(false);
        setError(null);
      } else {
        // Topics loaded but specific topic not found
        setError("Topic not found");
        setIsLoading(false);
      }
    } else if (!isLoadingStage && !isLoadingTopics) {
      // Loading completed but no topics found
      if (!fetchedStage) {
        setError("Stage not found");
      } else if (!fetchedTopics || fetchedTopics.length === 0) {
        setError("No topics found for this stage");
      }
      setIsLoading(false);
    }
  }, [fetchedTopics, fetchedStage, stageOrder, isLoadingStage, isLoadingTopics]);

  useEffect(() => {
    // Only set errors after loading completes
    if (isLoadingStage || isLoadingTopics) {
      return;
    }
    
    if (stageError) {
      setError(stageError.message || "Failed to fetch stage");
      setIsLoading(false);
    }
  }, [stageError, isLoadingStage, isLoadingTopics]);

  // Helper function to check if a slide has content
  const slideHasContent = (slide: SlideData): boolean => {
    const hasImageUrl = !!slide.imageUrl;
    const hasVideoUrl = !!slide.videoUrl;
    const hasTextHtml = slide.kind === "text" && !!slide.textHtml?.trim();
    // Note: quiz slides are not used in readonly view for curriculum topics
    
    return hasImageUrl || hasVideoUrl || hasTextHtml;
  };

  // Convert topic slides to SlideData format and filter out empty slides
  const allSlides: SlideData[] = (topic?.slides || [])
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((slide) => ({
      id: slide.id,
      topicId: slide.topicId,
      orderIndex: slide.orderIndex,
      kind: slide.kind as "text" | "image" | "video" | "quiz",
      imageUrl: slide.imageUrl,
      videoUrl: slide.videoUrl,
      textHtml: slide.textHtml,
      signedUrl: slide.signedUrl || undefined,
    }));
  
  // Filter out empty slides (slides without any content)
  const slides = allSlides.filter(slideHasContent);

  const handlePreviousSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1));
  }, [slides.length]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1));
      }
    },
    [slides.length]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const currentSlide = slides[currentSlideIndex];

  if (isLoading || isLoadingStage || isLoadingTopics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !topic || !stage) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() =>
            router.push(`/schools/${schoolId}/content/${stageSlug}`)
          }
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Topics
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p className="font-medium">Error loading topic</p>
              <p className="text-sm text-muted-foreground mt-2">
                {error || "Topic not found"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              router.push(`/schools/${schoolId}/content/${stageSlug}`)
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{topic.title}</h1>
            <p className="text-sm text-muted-foreground">
              {stage.name} • {slides.length} {slides.length === 1 ? "slide" : "slides"}
            </p>
          </div>
        </div>
        {topic.stageOrder !== null && (
          <Badge variant="secondary" className="text-sm">
            Topic {topic.stageOrder}
          </Badge>
        )}
      </div>

      <Separator />

      {/* Main Slide Viewer */}
      <Card>
        <CardContent className="p-0">
          {slides.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No slides available
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This topic doesn't have any slides yet.
              </p>
            </div>
          ) : (
            <div className="flex flex-row h-[calc(100vh-200px)]">
              {/* Slide Renderer - 3/4 width */}
              <div className={`flex flex-col ${slides.length > 1 ? 'w-3/4 border-r' : 'w-full'}`}>
                {/* Header */}
                <div className="px-6 py-4 border-b">
                  <h2 className="text-xl font-semibold">{topic.title}</h2>
                </div>

                {/* Slide Display */}
                <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
                  <div className="w-full h-full max-w-full max-h-full flex items-center justify-center">
                    {currentSlide && (
                      <div className="w-full h-full aspect-video bg-muted rounded-lg overflow-hidden">
                        <SlideRenderer
                          slide={currentSlide}
                          className="w-full h-full"
                          thumbnailOnly={false}
                          isCertification={false}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer with Controls */}
                <div className="px-6 py-4 border-t flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousSlide}
                    disabled={currentSlideIndex === 0 || slides.length === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {slides.length > 1 ? (
                    <Select
                      value={String(currentSlideIndex + 1)}
                      onValueChange={(value) =>
                        setCurrentSlideIndex(parseInt(value) - 1)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {slides.map((_, index) => (
                          <SelectItem key={index + 1} value={String(index + 1)}>
                            Slide {index + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Slide 1 of 1
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextSlide}
                    disabled={currentSlideIndex === slides.length - 1 || slides.length === 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Slide Gallery - 1/4 width */}
              {slides.length > 1 && (
                <div className="w-1/4 flex flex-col">
                  <div className="px-4 py-3 border-b">
                    <h3 className="text-sm font-medium">All Slides</h3>
                  </div>
                  <div
                    ref={slideGalleryRef}
                    className="flex-1 overflow-y-auto p-4 space-y-3"
                  >
                    {slides.map((slide, index) => (
                      <button
                        key={slide.id}
                        onClick={() => setCurrentSlideIndex(index)}
                        className={`
                          w-full relative transition-all rounded-lg overflow-hidden
                          ${
                            index === currentSlideIndex
                              ? "ring-2 ring-primary ring-offset-2"
                              : "opacity-70 hover:opacity-100"
                          }
                        `}
                        style={{
                          aspectRatio: "16 / 9",
                        }}
                      >
                        <SlideRenderer
                          slide={slide}
                          className="w-full h-full"
                          thumbnailOnly={true}
                          isCertification={false}
                        />
                        <div className="absolute bottom-0 left-0 right-0 text-center text-xs font-medium py-1 px-2 bg-background/80 text-foreground">
                          Slide {slide.orderIndex + 1}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
