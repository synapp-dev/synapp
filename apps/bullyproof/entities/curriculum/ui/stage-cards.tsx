"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
import { BookOpen, Plus, Loader2 } from "lucide-react";
import type { curriculumStages, topics } from "@/server/db/schema";
import { useTopicsByStage, useTopicsStore } from "@/entities/topics/model/store-enhanced";

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
  slides?: Array<{
    id: string;
    kind: string;
    orderIndex: number;
    signedUrl?: string | null;
  }>;
  imageSlideId?: string | null;
};

interface TopicImageThumbnailProps {
  topic: TopicWithImage;
  onTopicClick: (topic: Topic, e: React.MouseEvent) => void;
  index?: number; // Index for staggered animation start
}

function TopicImageThumbnail({
  topic,
  onTopicClick,
  index = 0,
}: TopicImageThumbnailProps) {
  // Get all image slides sorted by orderIndex
  const imageSlides = useMemo(() => {
    if (!topic.slides) return [];
    return topic.slides
      .filter((slide) => slide.kind === "image")
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [topic.slides]);

  // Access store directly to get URLs for all slides
  const { slideUrls: storeSlideUrls } = useTopicsStore();

  // Get URLs for all image slides
  const slideUrls = useMemo(() => {
    return imageSlides
      .map((slide) => {
        // Prefer direct signedUrl from API
        if (slide.signedUrl) {
          return slide.signedUrl;
        }
        // Fall back to cached URL from store
        const cached = storeSlideUrls[slide.id];
        if (cached) {
          // Check if expired (1 week)
          const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
          if (Date.now() - cached.timestamp <= CACHE_EXPIRY_MS) {
            return cached.url;
          }
        }
        return null;
      })
      .filter((url): url is string => url !== null);
  }, [imageSlides, storeSlideUrls]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Cycle through slides with slide-up animation
  // Offset start time based on index to stagger animations
  useEffect(() => {
    if (slideUrls.length <= 1) return;

    // Stagger the initial delay: each thumbnail starts 200ms after the previous one
    const initialDelay = index * 200;

    const startAnimation = () => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % slideUrls.length);
        setIsTransitioning(false);
      }, 600); // Match transition duration
    };

    let interval: NodeJS.Timeout | null = null;

    // Initial delay to stagger the start
    const initialTimeout = setTimeout(() => {
      startAnimation();
      // Then continue with regular interval
      interval = setInterval(startAnimation, 1500); // Change every 1.5 seconds
    }, initialDelay);

    return () => {
      clearTimeout(initialTimeout);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [slideUrls.length, index]);

  const currentUrl = slideUrls[currentIndex];
  const nextIndex = (currentIndex + 1) % slideUrls.length;
  const nextUrl = slideUrls[nextIndex];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="relative aspect-video rounded-md overflow-hidden border border-border cursor-pointer hover:opacity-80 transition-opacity bg-muted"
          onClick={(e) => onTopicClick(topic, e)}
        >
          {slideUrls.length > 0 ? (
            <>
              {/* Current image - slides up and out when transitioning */}
              {currentUrl && (
                <div
                  key={`current-${currentIndex}`}
                  className={`absolute inset-0 transition-transform duration-[600ms] ease-in-out ${
                    isTransitioning ? "-translate-y-full" : "translate-y-0"
                  }`}
                >
                  <Image
                    src={currentUrl}
                    alt={topic.title}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                </div>
              )}
              {/* Next image - slides up from bottom, always rendered but positioned below when not transitioning */}
              {nextUrl && slideUrls.length > 1 && (
                <div
                  key={`next-${nextIndex}`}
                  className={`absolute inset-0 transition-transform duration-[600ms] ease-in-out ${
                    isTransitioning ? "translate-y-0" : "translate-y-full"
                  }`}
                >
                  <Image
                    src={nextUrl}
                    alt={topic.title}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-2 gap-2">
              <Image
                src="/images/bp-small-logo.svg"
                alt="BullyProof Logo"
                width={32}
                height={32}
                className="flex-shrink-0"
              />
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
  basePath?: string; // e.g., "/admin/content/curriculum"
}

function StageCard({ stage, index, onStageClick, basePath }: StageCardProps) {
  const router = useRouter();
  
  // Use new store hook to fetch topics with slides and URLs
  const { topics, isLoading: isLoadingTopics } = useTopicsByStage(stage.id, {
    includeSlides: true,
    includeUrls: true,
  });

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
                  {displayedTopics.map((topic, topicIndex) => (
                    <TopicImageThumbnail
                      key={topic.id}
                      topic={topic}
                      onTopicClick={handleTopicClick}
                      index={topicIndex}
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
  basePath?: string; // e.g., "/admin/content/curriculum"
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
