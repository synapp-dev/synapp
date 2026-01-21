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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { BookOpen } from "lucide-react";
import type { curriculumStages, certificationCourses, topics, courseTopics } from "@/server/db/schema";
import {
  useTopicsByStage,
  useTopicsStore,
} from "@/entities/topics/model/store-enhanced";
import {
  useCertificationTopicsByStageCode,
  useCertificationTopicsStore,
} from "@/entities/certification/model/topics-store";

// Base stage types
type CurriculumStage = typeof curriculumStages.$inferSelect & {
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

type CertificationStage = typeof certificationCourses.$inferSelect & {
  topicCount?: number;
};

// Union type for stages
type Stage = CurriculumStage | CertificationStage;

// Topic types
type CurriculumTopic = typeof topics.$inferSelect;
type CertificationTopic = typeof courseTopics.$inferSelect;

// Generic topic type that works for both
type TopicWithImage = (CurriculumTopic | CertificationTopic) & {
  slides?: Array<{
    id: string;
    kind: string;
    orderIndex: number;
    signedUrl?: string | null;
    signedImageUrl?: string | null; // API may return this instead of signedUrl
  }>;
  imageSlideId?: string | null;
  stageOrder?: number | null;
};

interface TopicImageThumbnailProps {
  topic: TopicWithImage;
  onTopicClick: (topic: TopicWithImage, e: React.MouseEvent) => void;
  index?: number; // Index for staggered animation start
  type?: "curriculum" | "certification";
}

function TopicImageThumbnail({
  topic,
  onTopicClick,
  index = 0,
  type = "curriculum",
}: TopicImageThumbnailProps) {
  // Get all image slides sorted by orderIndex
  const imageSlides = useMemo(() => {
    if (!topic.slides) return [];
    return topic.slides
      .filter((slide) => slide.kind === "image")
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [topic.slides]);

  // Access appropriate store based on type
  const { slideUrls: curriculumSlideUrls } = useTopicsStore();
  // Note: certification topics store doesn't have slideUrls - URLs are in topic.slides[].signedUrl
  const storeSlideUrls = type === "certification" ? undefined : curriculumSlideUrls;

  // Get URLs for all image slides
  const slideUrls = useMemo(() => {
    return imageSlides
      .map((slide) => {
        if (!slide || !slide.id) return null;
        
        // Prefer direct signedUrl or signedImageUrl from API (works for both curriculum and certification)
        // API may return signedImageUrl for certification topics
        const directUrl = slide.signedUrl || (slide as any).signedImageUrl;
        if (directUrl) {
          return directUrl;
        }
        
        // Fall back to cached URL from store (only for curriculum topics)
        if (storeSlideUrls) {
          const cached = storeSlideUrls[slide.id];
          if (cached) {
            // Check if expired (1 week)
            const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - cached.timestamp <= CACHE_EXPIRY_MS) {
              return cached.url;
            }
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
      interval = setInterval(startAnimation, 5000); // Change every 5 seconds
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
          className="relative aspect-video overflow-hidden cursor-pointer hover:opacity-80 transition-opacity bg-muted"
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
  type?: "curriculum" | "certification";
}

function StageCard({ stage, index, onStageClick, basePath, type = "curriculum" }: StageCardProps) {
  const router = useRouter();

  // Use appropriate hook based on type
  const curriculumTopicsQuery = useTopicsByStage(
    type === "curriculum" ? (stage as CurriculumStage).id : null,
    type === "curriculum" ? {
      includeSlides: true,
      includeUrls: true,
    } : undefined
  );

  const certificationTopicsQuery = useCertificationTopicsByStageCode(
    type === "certification" ? (stage as CertificationStage).code : null,
    type === "certification" ? {
      includeSlides: true,
      includeUrls: true,
    } : undefined
  );

  const topics = type === "certification" 
    ? (certificationTopicsQuery.topics || [])
    : (curriculumTopicsQuery.topics || []);
  const isLoadingTopics = type === "certification"
    ? certificationTopicsQuery.isLoading
    : curriculumTopicsQuery.isLoading;

  // For certification (2 columns), show single row. For curriculum, show 2x2 grid
  const displayedTopics = type === "certification" 
    ? topics.slice(0, 4) // Show up to 4 topics in a single row
    : topics.slice(0, 4); // Show 4 topics in 2x2 grid
  const hasMoreTopics = topics.length > displayedTopics.length;

  const handleTopicClick = (topic: TopicWithImage, e: React.MouseEvent) => {
    e.stopPropagation();
    if (basePath) {
      if (type === "certification") {
        // For certification topics, use slug if available, otherwise fallback to courseOrder
        const certTopic = topic as CertificationTopic & { slug?: string; courseOrder?: number | null };
        if (certTopic.slug) {
          router.push(`${basePath}/${stage.code}/${certTopic.slug}`);
        } else if (certTopic.courseOrder !== null && certTopic.courseOrder !== undefined) {
          // Fallback to courseOrder for backward compatibility
          router.push(`${basePath}/${stage.code}/T${certTopic.courseOrder}`);
        }
      } else {
        // For curriculum topics, use stageOrder
        if (topic.stageOrder !== null && topic.stageOrder !== undefined) {
          router.push(`${basePath}/${stage.code}/T${topic.stageOrder}`);
        }
      }
    } else if (onStageClick) {
      // If no basePath, navigate to stage first
      onStageClick(stage);
    }
  };

  return (
    <div className={type === "certification" ? "md:col-span-2" : ""}>
      <StaggeredAnimation key={stage.id} index={index}>
        <Card
          className={`relative transition-shadow pb-0 overflow-hidden ${
            onStageClick ? "cursor-pointer hover:shadow-md" : ""
          }`}
          onClick={() => onStageClick?.(stage)}
        >
        <CardHeader className="py-0">
          <div className="space-y-0">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-xl">
                <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
                <span>{stage.name}</span>
              </CardTitle>
              {!isLoadingTopics && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {topics.length} {topics.length === 1 ? "topic" : "topics"}
                </span>
              )}
            </div>
            {type === "curriculum" && (stage as CurriculumStage).years && (stage as CurriculumStage).years!.length > 0 && (
              <div className="flex items-center gap-x-2 text-xs text-muted-foreground">
                {(stage as CurriculumStage).years!
                  .flatMap((year, index) => [
                    index > 0 && (
                      <span key={`dot-${year.id}`} className="opacity-50">
                        •
                      </span>
                    ),
                    <span key={year.id}>{year.displayName}</span>,
                  ])
                  .filter(Boolean)}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingTopics ? (
            <div className={type === "certification" ? "grid grid-cols-4" : "grid grid-cols-2"}>
              {[...Array(type === "certification" ? 4 : 4)].map((_, i) => (
                <Skeleton key={i} className="aspect-video" />
              ))}
            </div>
          ) : displayedTopics.length > 0 ? (
            <TooltipProvider>
              <div className={type === "certification" ? "grid grid-cols-4" : "grid grid-cols-2"}>
                {displayedTopics.map((topic, topicIndex) => (
                  <TopicImageThumbnail
                    key={topic.id}
                    topic={topic}
                    onTopicClick={handleTopicClick}
                    index={topicIndex}
                    type={type}
                  />
                ))}
              </div>
            </TooltipProvider>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              No topics available
            </div>
          )}
        </CardContent>
      </Card>
    </StaggeredAnimation>
    </div>
  );
}

interface StageCardsProps {
  stages: Stage[];
  onStageClick?: (stage: Stage) => void;
  basePath?: string; // e.g., "/admin/content/curriculum"
  type?: "curriculum" | "certification";
}

export function StageCards({
  stages,
  onStageClick,
  basePath,
  type = "curriculum",
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
          type={type}
        />
      ))}
    </div>
  );
}
