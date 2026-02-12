"use client";

import { useState, useEffect, useCallback } from "react";
import { useLessonById } from "@/entities/lessons/api/useLessonById";
import { topicsApi } from "@/entities/topics/api/endpoints";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { getDisplayStatus } from "@/utils/lesson-status";
import { SlideRenderer, type SlideData } from "@/components/organisms/slide-renderer";

interface LessonHeaderProps {
  lessonId: string;
}

export function LessonHeader({ lessonId }: LessonHeaderProps) {
  const { data: lessonData, isLoading } = useLessonById(lessonId);
  const [firstSlide, setFirstSlide] = useState<SlideData | null>(null);
  const [isLoadingSlides, setIsLoadingSlides] = useState(false);

  // Fetch first slide for thumbnail
  const fetchFirstSlide = useCallback(async (topicId: string) => {
    try {
      setIsLoadingSlides(true);
      const topicResult = await topicsApi.get.byId(topicId, {
        includeSlides: true,
        includeUrls: true,
      });
      if (topicResult.data?.slides && topicResult.data.slides.length > 0) {
        const sortedSlides = topicResult.data.slides.sort(
          (a, b) => a.orderIndex - b.orderIndex
        );
        const slide = sortedSlides[0];
        setFirstSlide({
          id: slide.id,
          kind: slide.kind as "text" | "image" | "video",
          orderIndex: slide.orderIndex,
          textHtml: slide.textHtml ?? null,
          imageUrl: slide.imageUrl ?? null,
          videoUrl: slide.videoUrl ?? null,
          videoStartS: slide.videoStartS ?? null,
          videoEndS: slide.videoEndS ?? null,
          signedUrl: (slide as { signedUrl?: string }).signedUrl ?? null,
          signedImageUrl: (slide as { signedImageUrl?: string }).signedImageUrl ?? null,
          signedVideoUrl: (slide as { signedVideoUrl?: string }).signedVideoUrl ?? null,
        });
      }
    } catch (err) {
      console.error("Failed to fetch first slide:", err);
    } finally {
      setIsLoadingSlides(false);
    }
  }, []);

  useEffect(() => {
    if (lessonData?.topicId) {
      fetchFirstSlide(lessonData.topicId);
    }
  }, [lessonData?.topicId, fetchFirstSlide]);

  if (isLoading || !lessonData) {
    return (
      <div className="border-b pb-4 mb-6">
        <div className="flex gap-4">
          <Skeleton className="w-40 aspect-video rounded-lg flex-shrink-0" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-64" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const topic = lessonData.topic as any;
  const assignedClasses = lessonData.assignedClasses || [];
  const status = getDisplayStatus(lessonData.status || "", lessonData.scheduledFor);
  
  const formatStatus = (status: string) => {
    return status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "default" as const;
      case "feedback":
        return "secondary" as const;
      case "in progress":
        return "secondary" as const;
      case "scheduled":
        return "outline" as const;
      case "preparing":
        return "outline" as const;
      case "ready":
        return "default" as const;
      case "cancelled":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <div className="flex gap-4 bg-muted p-6 rounded-lg">
      {/* First slide thumbnail */}
      {firstSlide ? (
        <div className="flex-shrink-0 w-40 aspect-video rounded-lg overflow-hidden">
          <SlideRenderer
            slide={firstSlide}
            className="w-full h-full"
            thumbnailOnly={true}
          />
        </div>
      ) : isLoadingSlides ? (
        <Skeleton className="w-40 aspect-video rounded-lg flex-shrink-0" />
      ) : null}

      <div className="space-y-3 flex-1">
        {/* Lesson Label */}
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Lesson
        </p>
        
        {/* Topic Number and Name */}
        {topic && (
          <div className="flex items-center gap-2">
            {topic.stageOrder !== null && topic.stageOrder !== undefined && (
              <Badge
                variant="secondary"
                className="text-xs font-bold border-0 py-0 px-1.5 h-5 rounded-sm"
              >
                L{topic.stageOrder}
              </Badge>
            )}
            <h2 className="text-2xl font-semibold text-foreground capitalize">
              {topic.title}
            </h2>
          </div>
        )}
        
        {/* Classes and Status */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Class Badges */}
          {assignedClasses.length > 0 ? (
            <div className="flex items-center gap-2 flex-wrap">
              {assignedClasses.map((classItem: any) => (
                <Badge
                  key={classItem.classId}
                  variant="outline"
                  className="text-xs"
                >
                  {classItem.className}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">No classes assigned</span>
          )}
          
          {/* Status Badge */}
          <Badge variant={getStatusBadgeVariant(status)} className="text-xs">
            {formatStatus(status)}
          </Badge>
        </div>
      </div>
    </div>
  );
}
