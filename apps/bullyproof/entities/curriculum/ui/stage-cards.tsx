"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { BookOpen, Plus, Loader2, Image } from "lucide-react";
import type { curriculumStages, topics } from "@/server/db/schema";
import { topicsApi } from "@/entities/topics/api/endpoints";
import { useTopicSlidesCacheStore } from "@/stores/topic-slides-cache-store";

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

type TopicWithImage = Topic & {
  imageSlideId?: string | null;
};

interface TopicImageThumbnailProps {
  topic: TopicWithImage;
  onTopicClick: (topic: Topic, e: React.MouseEvent) => void;
}

function TopicImageThumbnail({
  topic,
  onTopicClick,
}: TopicImageThumbnailProps) {
  const getSlideUrl = useTopicSlidesCacheStore((state) => state.getSlideUrl);
  const cachedUrl = useTopicSlidesCacheStore(
    (state) => (topic.imageSlideId ? state.cache[topic.imageSlideId]?.url ?? null : null)
  );
  const loading = useTopicSlidesCacheStore(
    (state) => (topic.imageSlideId ? state.loading[topic.imageSlideId] ?? false : false)
  );
  const [imageUrl, setImageUrl] = useState<string | null>(cachedUrl);

  // Fetch URL using cache store (same as ThumbnailImage component)
  useEffect(() => {
    if (topic.imageSlideId && !topic.imageSlideId.startsWith("temp_")) {
      // If we already have a cached URL, use it immediately
      if (cachedUrl) {
        setImageUrl(cachedUrl);
        return;
      }

      // Otherwise, fetch it
      let cancelled = false;
      getSlideUrl(topic.imageSlideId).then((url) => {
        if (!cancelled) {
          setImageUrl(url);
        }
      });

      return () => {
        cancelled = true;
      };
    } else {
      setImageUrl(null);
    }
  }, [topic.imageSlideId, getSlideUrl, cachedUrl]);

  // Update when cached URL changes (for instant updates after cache updates)
  useEffect(() => {
    if (cachedUrl && !loading) {
      setImageUrl(cachedUrl);
    }
  }, [cachedUrl, loading]);

  const isLoading = loading && !imageUrl;
  const hasImage = !isLoading && imageUrl;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="relative aspect-video rounded-md overflow-hidden border border-border cursor-pointer hover:opacity-80 transition-opacity bg-muted"
          onClick={(e) => onTopicClick(topic, e)}
        >
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={topic.title}
              className="w-full h-full object-cover"
              onError={() => {
                setImageUrl(null);
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-2 gap-2">
              <Image className="h-8 w-8 flex-shrink-0" />
              <p className="text-xs text-center line-clamp-1 truncate w-full">
                {topic.title}
              </p>
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{topic.title}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface StageCardProps {
  stage: Stage;
  index: number;
  onStageClick?: (stage: Stage) => void;
  basePath?: string; // e.g., "/admin/content/curriculum" or "/schools/{schoolId}/content"
}

function StageCard({ stage, index, onStageClick, basePath }: StageCardProps) {
  const router = useRouter();
  const [topics, setTopics] = useState<TopicWithImage[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const getSlideUrl = useTopicSlidesCacheStore((state) => state.getSlideUrl);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setIsLoadingTopics(true);
        const result = await topicsApi.get.list({ 
          stageId: stage.id,
          limit: 100 
        });
        if (result.data) {
          // Sort by stageOrder
          const sorted = [...result.data].sort((a, b) => {
            if (a.stageOrder === null) return 1;
            if (b.stageOrder === null) return -1;
            return a.stageOrder - b.stageOrder;
          });

          // Fetch slides for first 4 topics to get image slide IDs
          const topicsWithSlideIds = await Promise.all(
            sorted.slice(0, 4).map(async (topic) => {
              try {
                const topicResult = await topicsApi.get.byId(topic.id);
                if (topicResult.data?.slides) {
                  // Find first image slide
                  const imageSlide = topicResult.data.slides
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .find((slide) => slide.kind === "image" && slide.imageUrl);

                  if (imageSlide) {
                    return { ...topic, imageSlideId: imageSlide.id };
                  }
                }
                return { ...topic, imageSlideId: null };
              } catch (err) {
                console.error(`Failed to fetch slides for topic ${topic.id}:`, err);
                return { ...topic, imageSlideId: null };
              }
            })
          );

          // Add remaining topics without images
          const remainingTopics = sorted.slice(4).map((topic) => ({
            ...topic,
            imageSlideId: null,
          }));

          setTopics([...topicsWithSlideIds, ...remainingTopics]);
        }
      } catch (err) {
        console.error(`Failed to fetch topics for stage ${stage.id}:`, err);
      } finally {
        setIsLoadingTopics(false);
      }
    };

    fetchTopics();
  }, [stage.id, getSlideUrl]);

  const displayedTopics = topics.slice(0, 4);
  const hasMoreTopics = topics.length > 4;

  const handleTopicClick = (topic: Topic, e: React.MouseEvent) => {
    e.stopPropagation();
    if (topic.stageOrder !== null && topic.stageOrder !== undefined) {
      if (basePath) {
        router.push(`${basePath}/${stage.code}/T${topic.stageOrder}`);
      } else if (onStageClick) {
        // If no basePath, navigate to stage first
        onStageClick(stage);
      }
    }
  };

  return (
    <StaggeredAnimation key={stage.id} index={index}>
      <Card
        className={`relative transition-shadow ${
          onStageClick ? "cursor-pointer hover:shadow-md" : ""
        }`}
        onClick={() => onStageClick?.(stage)}
      >
        <CardHeader>
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
              <span>{stage.name}</span>
            </CardTitle>
            {stage.years && stage.years.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {stage.years.map((year) => (
                  <Badge key={year.id} variant="outline" className="text-xs text-muted-foreground bg-muted/50">
                    {year.displayName}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoadingTopics ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="aspect-video rounded-md" />
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                disabled
              >
                Show all topics
              </Button>
            </>
          ) : displayedTopics.length > 0 ? (
            <>
              <TooltipProvider>
                <div className="grid grid-cols-2 gap-2">
                  {displayedTopics.map((topic) => (
                    <TopicImageThumbnail
                      key={topic.id}
                      topic={topic}
                      onTopicClick={handleTopicClick}
                    />
                  ))}
                </div>
              </TooltipProvider>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to stage detail page (same as clicking the card)
                  if (onStageClick) {
                    onStageClick(stage);
                  }
                }}
              >
                Show all {topics.length} topics
              </Button>
            </>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">
                No topics available
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                disabled
              >
                Show all topics
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </StaggeredAnimation>
  );
}

interface StageCardsProps {
  stages: Stage[];
  onStageClick?: (stage: Stage) => void;
  basePath?: string; // e.g., "/admin/content/curriculum" or "/schools/{schoolId}/content"
}

export function StageCards({
  stages,
  onStageClick,
  basePath,
}: StageCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stages.map((stage, index) => (
        <StageCard
          key={stage.id}
          stage={stage}
          index={index}
          onStageClick={onStageClick}
          basePath={basePath}
        />
      ))}
    </div>
  );
}
