"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";
import { topicsApi } from "@/entities/topics/api/endpoints";
import type { curriculumStages, topics } from "@/server/db/schema";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Loader2,
  ArrowLeft,
  BookOpen,
  FileText,
  Image as ImageIcon,
  Video,
  Check,
  BadgeCheck,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import Image from "next/image";
import { getSlideImagePublicUrl } from "@/utils/supabase/upload";

// Component to handle thumbnail image with error fallback
function ThumbnailImage({ src, alt }: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="w-14 h-14 flex-shrink-0 rounded-md bg-muted flex items-center justify-center">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative w-14 h-14 flex-shrink-0 rounded-md overflow-hidden bg-muted">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

type Stage = typeof curriculumStages.$inferSelect & {
  years?: Array<{
    id: string;
    code: string;
    displayName: string;
    sortIndex: number;
    level: {
      id: string;
      name: string;
      key: string;
    };
  }>;
};

type Topic = typeof topics.$inferSelect;

type TopicSlide = {
  id: string;
  topicId: string;
  orderIndex: number;
  kind: "text" | "image" | "video";
  imageUrl: string | null;
  videoUrl: string | null;
  textHtml: string | null;
};

type TopicWithSlides = Topic & {
  slides?: TopicSlide[];
};

interface StageDetailSectionProps {
  slug: string;
}

export function StageDetailSection({ slug }: StageDetailSectionProps) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage | null>(null);
  const [topics, setTopics] = useState<TopicWithSlides[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const fetchStage = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await curriculumApi.stages.byCode(slug);
        if (result.error) {
          setError(
            result.error.message ?? "Failed to fetch curriculum stage details"
          );
        } else if (result.data) {
          setStage(result.data);
        } else {
          setError("Failed to fetch curriculum stage details");
        }
      } catch (err) {
        console.error("Failed to fetch curriculum stage:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch curriculum stage details"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchStage();
  }, [slug]);

  useEffect(() => {
    if (!stage?.id) return;

    const fetchTopics = async () => {
      try {
        setIsLoadingTopics(true);
        const result = await topicsApi.get.list({ stageId: stage.id });
        if (result.data) {
          // Fetch slides for each topic in parallel
          const topicsWithSlides = await Promise.all(
            result.data.map(async (topic) => {
              try {
                const topicResult = await topicsApi.get.byId(topic.id);
                if (topicResult.data?.slides) {
                  return { ...topic, slides: topicResult.data.slides };
                }
                return { ...topic, slides: [] };
              } catch (err) {
                console.error(
                  `Failed to fetch slides for topic ${topic.id}:`,
                  err
                );
                return { ...topic, slides: [] };
              }
            })
          );
          setTopics(topicsWithSlides);
        }
      } catch (err) {
        console.error("Failed to fetch topics:", err);
      } finally {
        setIsLoadingTopics(false);
      }
    };

    fetchTopics();
  }, [stage?.id]);

  const handleTopicClick = (topic: TopicWithSlides) => {
    // Navigate to topic page using T{stageOrder} format
    // If stageOrder is null, we can't navigate (shouldn't happen in practice)
    if (topic.stageOrder !== null && topic.stageOrder !== undefined) {
      router.push(`/admin/content/curriculum/${slug}/T${topic.stageOrder}`);
    }
  };

  const getSlideStats = (topic: TopicWithSlides) => {
    // Sort slides by orderIndex to ensure correct order
    const slides = (topic.slides || []).sort(
      (a, b) => a.orderIndex - b.orderIndex
    );
    const totalSlides = slides.length;
    const imageSlides = slides.filter((s) => s.kind === "image").length;
    const videoSlides = slides.filter((s) => s.kind === "video").length;

    // Find the first image slide by orderIndex (not just any image slide)
    const firstImageSlide = slides.find(
      (s) => s.kind === "image" && s.imageUrl
    );

    // Generate public URL for thumbnail if we have an image slide
    let thumbnailUrl: string | null = null;
    if (firstImageSlide && stage) {
      // Extract stage number from stage.code (e.g., "S1" -> 1)
      const stageNumberMatch = stage.code.match(/^S(\d+)$/);
      const stageNumber = stageNumberMatch
        ? parseInt(stageNumberMatch[1], 10)
        : null;

      // Get topic number from topic.stageOrder
      const topicNumber = topic.stageOrder;

      if (stageNumber !== null && topicNumber !== null) {
        // Extract file extension from imageUrl or default to "jpg"
        let fileExtension = "jpg";
        if (firstImageSlide.imageUrl) {
          const urlMatch = firstImageSlide.imageUrl.match(
            /\.([a-zA-Z0-9]+)(?:\?|$)/
          );
          if (urlMatch) {
            fileExtension = urlMatch[1];
          }
        }

        thumbnailUrl = getSlideImagePublicUrl(
          firstImageSlide.id,
          stageNumber,
          topicNumber,
          fileExtension
        );

        // Debug logging (can be removed later)
        console.log("Thumbnail URL generation:", {
          slideId: firstImageSlide.id,
          stageNumber,
          topicNumber,
          fileExtension,
          thumbnailUrl,
          slideOrderIndex: firstImageSlide.orderIndex,
        });
      }
    }

    return {
      totalSlides,
      imageSlides,
      videoSlides,
      firstImageSlide,
      thumbnailUrl,
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading curriculum stage...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/content/curriculum")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stages
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p className="font-medium">Error loading curriculum stage</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stage) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/content")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stages
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p className="font-medium">Stage not found</p>
              <p className="text-sm mt-2">
                The curriculum stage you're looking for doesn't exist.
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
      <Button variant="ghost" onClick={() => router.push("/admin/content")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Stages
      </Button>

      {/* Stage Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">{stage.name}</h1>
        </div>
        {stage.years && stage.years.length > 0 && (
          <div className="flex items-center gap-3">
            {stage.years.map((year) => (
              <Badge
                key={year.id}
                variant="secondary"
                className="px-4 py-2 text-base"
              >
                {year.displayName}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Topics Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Topics</h2>
        </div>

        {isLoadingTopics ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No topics found for this stage.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {topics.map((topic) => {
              const { totalSlides, imageSlides, videoSlides, thumbnailUrl } =
                getSlideStats(topic);
              return (
                <Card
                  key={topic.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors p-0"
                  onClick={() => handleTopicClick(topic)}
                >
                  <CardContent className="flex items-center gap-3">
                    {/* Thumbnail */}
                    {thumbnailUrl ? (
                      <ThumbnailImage src={thumbnailUrl} alt={topic.title} />
                    ) : (
                      <div className="w-14 h-14 flex-shrink-0 rounded-md bg-muted flex items-center justify-center">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}

                    {/* Topic Info */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {topic.stageOrder !== null && (
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-xs flex-shrink-0">
                          {topic.stageOrder}
                        </div>
                      )}
                      <div className="flex items-center flex-1 min-w-0 gap-2">
                        <p className="font-medium truncate">{topic.title}</p>
                        {topic.status === "published" && (
                          <BadgeCheck className=" text-blue-500 size-5" />
                        )}
                      </div>
                    </div>

                    {/* Slide Stats */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-xs text-muted-foreground">
                        {totalSlides} {totalSlides === 1 ? "slide" : "slides"}
                      </div>
                      {imageSlides > 0 && (
                        <Badge
                          variant="outline"
                          className="gap-1 text-xs py-0 px-1.5 h-5"
                        >
                          <ImageIcon className="h-2.5 w-2.5" />
                          {imageSlides}
                        </Badge>
                      )}
                      {videoSlides > 0 && (
                        <Badge
                          variant="outline"
                          className="gap-1 text-xs py-0 px-1.5 h-5"
                        >
                          <Video className="h-2.5 w-2.5" />
                          {videoSlides}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
