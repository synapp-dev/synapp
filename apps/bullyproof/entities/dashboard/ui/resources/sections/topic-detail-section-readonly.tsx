"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  ChevronDown,
  FileText,
  Download,
} from "lucide-react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  SlideRenderer,
  type SlideData,
} from "@/components/organisms/slide-renderer";
import { Separator } from "@workspace/ui/components/separator";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer";
import { Badge } from "@workspace/ui/components/badge";
import {
  useTopicsByStage,
} from "@/entities/topics/model/store-enhanced";
import { useStageBySlug } from "@/entities/stages/model/store";
import { compareSlidesByPosition } from "@/server/lib/fractional-position";
import { topicsApi } from "@/entities/topics/api/endpoints";
import type { topics, topicSlides } from "@/server/db/schema";
import { createSlug } from "@/utils/slug";
import { getAuthHeaders } from "@/lib/api/fetcher.client";
import { toast } from "sonner";

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
  const [showGalleryDrawer, setShowGalleryDrawer] = useState(false);
  const [lessonPlans, setLessonPlans] = useState<
    Array<{ id: string; fileName: string; topicId: string }>
  >([]);
  const [isLoadingLessonPlans, setIsLoadingLessonPlans] = useState(false);
  const [isDownloadingLessonPlan, setIsDownloadingLessonPlan] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const slideGalleryRef = useRef<HTMLDivElement | null>(null);
  const wheelHandlerRef = useRef<((e: WheelEvent) => void) | null>(null);

  // Resolve topic by slug: primary = createSlug(title), fallback = T1/T2 legacy format
  const isLegacyFormat = /^T\d+$/.test(topicSlug);
  const legacyStageOrder = isLegacyFormat ? parseInt(topicSlug.substring(1)) : null;

  const {
    stage: fetchedStage,
    isLoading: isLoadingStage,
    error: stageError,
  } = useStageBySlug(stageSlug);

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
    if (fetchedTopics) {
      const foundTopic = isLegacyFormat
        ? fetchedTopics.find((t) => t.stageOrder === legacyStageOrder)
        : fetchedTopics.find((t) => createSlug(t.title) === topicSlug);
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
  }, [fetchedTopics, fetchedStage, topicSlug, isLegacyFormat, legacyStageOrder, isLoadingStage, isLoadingTopics]);

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

  // Fetch lesson plans when topic loads
  useEffect(() => {
    if (!topic?.id) {
      setLessonPlans([]);
      return;
    }
    let mounted = true;
    (async () => {
      setIsLoadingLessonPlans(true);
      try {
        const result = await topicsApi.lessonPlans.list(topic.id);
        if (mounted && result.data) {
          setLessonPlans(result.data);
        }
      } catch {
        if (mounted) setLessonPlans([]);
      } finally {
        if (mounted) setIsLoadingLessonPlans(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [topic?.id]);

  const handleLessonPlanDownload = useCallback(async () => {
    if (lessonPlans.length === 0) return;
    const planId = lessonPlans[0].id;
    setIsDownloadingLessonPlan(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/topic-lesson-plans/${planId}/download`, {
        headers,
      });
      if (!res.ok) {
        toast.error("Failed to download lesson plan");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition");
      const match = disposition?.match(/filename="?([^";\n]+)"?/);
      const filename = match?.[1] ?? "lesson-plan.pdf";
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      toast.error("Failed to download lesson plan", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsDownloadingLessonPlan(false);
    }
  }, [lessonPlans]);

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
    .sort(compareSlidesByPosition)
    .map((slide) => ({
      id: slide.id,
      topicId: slide.topicId,
      position: slide.position,
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

  // Scroll gallery to show current slide in drawer
  useEffect(() => {
    if (galleryRef.current && slides.length > 0) {
      const slideElement = galleryRef.current.children[
        currentSlideIndex
      ] as HTMLElement;
      if (slideElement) {
        slideElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }
    }
  }, [currentSlideIndex, slides.length]);

  // Wheel handler: convert vertical scroll to horizontal in slide gallery drawer
  const setSlideGalleryRef = useCallback((element: HTMLDivElement | null) => {
    if (slideGalleryRef.current && wheelHandlerRef.current) {
      slideGalleryRef.current.removeEventListener("wheel", wheelHandlerRef.current);
    }
    slideGalleryRef.current = element;
    if (!element) {
      wheelHandlerRef.current = null;
      return;
    }
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      element.scrollLeft += e.deltaY;
    };
    wheelHandlerRef.current = handleWheel;
    element.addEventListener("wheel", handleWheel, { passive: false });
  }, []);

  useEffect(() => {
    return () => {
      if (slideGalleryRef.current && wheelHandlerRef.current) {
        slideGalleryRef.current.removeEventListener("wheel", wheelHandlerRef.current);
      }
    };
  }, []);

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
    <div className="flex flex-col gap-6 flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
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
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {topic.stageOrder !== null && (
                <Badge variant="secondary" className="bg-muted font-bold">
                  L{topic.stageOrder}
                </Badge>
              )}
              {topic.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {stage.name} • {slides.length} {slides.length === 1 ? "slide" : "slides"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lessonPlans.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLessonPlanDownload}
              disabled={isDownloadingLessonPlan}
            >
              {isDownloadingLessonPlan ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="sr-only sm:not-sr-only">
                Download lesson plan
              </span>
            </Button>
          )}
        </div>
      </div>

      <Separator className="flex-shrink-0" />

      {/* Main Slide Viewer */}
      {slides.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-muted/30 rounded-lg flex-1">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            No slides available
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            This topic doesn&apos;t have any slides yet.
          </p>
        </div>
      ) : (
        <>
          {/* Slide Display */}
          <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-muted rounded-lg">
            {currentSlide && (
              <div className="w-full h-full max-w-full max-h-full flex items-center justify-center">
                <SlideRenderer
                  key={currentSlide.id}
                  slide={currentSlide}
                  className="w-full h-full max-w-full max-h-full"
                  thumbnailOnly={false}
                  isCertification={false}
                />
              </div>
            )}
          </div>

          {/* Controls */}
          {slides.length > 1 && (
            <div className="flex items-center justify-center gap-4 flex-shrink-0 mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviousSlide}
                disabled={currentSlideIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <button
                type="button"
                onClick={() => setShowGalleryDrawer(true)}
                className="flex w-fit items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span>
                  Slide {currentSlideIndex + 1} of {slides.length}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextSlide}
                disabled={currentSlideIndex === slides.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
          {slides.length === 1 && (
            <div className="flex items-center justify-center flex-shrink-0 text-sm text-muted-foreground mb-6">
              Slide 1 of 1
            </div>
          )}
        </>
      )}

      {/* Slide gallery drawer - from bottom */}
      {slides.length > 1 && (
      <Drawer open={showGalleryDrawer} onOpenChange={setShowGalleryDrawer}>
        <DrawerContent className="!left-1/2 !right-auto -translate-x-1/2 w-full max-w-[75rem] max-h-[50vh] rounded-t-xl border-x border-t shadow-lg data-[vaul-drawer-direction=bottom]:!left-1/2 data-[vaul-drawer-direction=bottom]:!right-auto">
          <DrawerHeader>
            <DrawerTitle>Jump to slide</DrawerTitle>
          </DrawerHeader>
          <div
            ref={(el) => {
              galleryRef.current = el;
              setSlideGalleryRef(el);
            }}
            className="flex gap-4 overflow-x-auto overflow-y-visible py-3 px-4 pb-6 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
          >
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => {
                  setCurrentSlideIndex(index);
                  setShowGalleryDrawer(false);
                }}
                className={`
                  flex-shrink-0 relative rounded-lg overflow-hidden shadow-lg bg-background cursor-pointer w-[180px]
                  ${
                    index === currentSlideIndex
                      ? "ring-2 ring-primary ring-offset-2"
                      : "opacity-70 hover:opacity-100"
                  }
                `}
                style={{ aspectRatio: "16 / 9" }}
              >
                <div className="w-full h-full relative">
                  <SlideRenderer
                    slide={slide}
                    className="w-full h-full"
                    thumbnailOnly={true}
                    isCertification={false}
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 text-center text-xs font-medium py-1 px-2 bg-background/80 text-foreground">
                  Slide {index + 1}
                </div>
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
      )}
    </div>
  );
}
