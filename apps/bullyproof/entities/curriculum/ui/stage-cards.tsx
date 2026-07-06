"use client";

import type {
  CertificationCourseRow,
  CourseTopicRow,
  CurriculumStageRow,
  TopicRow,
} from "@/types/db";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { BookOpen } from "lucide-react";
import {
  useTopicsByStage,
} from "@/entities/topics/model/store-enhanced";
import {
  useCertificationTopicsByStageCode,
} from "@/entities/certification/model/topics-store";
import { compareSlidesByPosition } from "@/lib/fractional-position";
import { createSlug } from "@/utils/slug";

// Base stage types
type CurriculumStage = CurriculumStageRow & {
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

type CertificationStage = CertificationCourseRow & {
  topicCount?: number;
};

// Union type for stages
type Stage = CurriculumStage | CertificationStage;

// Topic types
type CurriculumTopic = TopicRow;
type CertificationTopic = CourseTopicRow;

// Generic topic type that works for both
type TopicWithImage = (CurriculumTopic | CertificationTopic) & {
  slides?: Array<{
    id: string;
    kind: string;
    position: string;
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
  /** When true, slideshow advances; when false, freezes at current slide */
  isCardHovered?: boolean;
}

function TopicImageThumbnail({
  topic,
  onTopicClick,
  index = 0,
  type = "curriculum",
  isCardHovered = false,
}: TopicImageThumbnailProps) {
  // Get all image slides sorted by position
  const imageSlides = useMemo(() => {
    if (!topic.slides) return [];
    return topic.slides
      .filter((slide) => slide.kind === "image")
      .sort(compareSlidesByPosition);
  }, [topic.slides]);

  // Get URLs for all image slides (signed URLs come from the API / DB cache)
  const slideUrls = useMemo(() => {
    return imageSlides
      .map((slide) => {
        if (!slide || !slide.id) return null;
        return slide.signedUrl || (slide as any).signedImageUrl || null;
      })
      .filter((url): url is string => url !== null);
  }, [imageSlides]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Cycle through slides with slide-up animation only when card is hovered
  // When hover ends, freeze at current slide
  useEffect(() => {
    if (slideUrls.length <= 1 || !isCardHovered) return;

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
      interval = setInterval(startAnimation, 10000); // Change every 10 seconds
    }, initialDelay);

    return () => {
      clearTimeout(initialTimeout);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [slideUrls.length, index, isCardHovered]);

  const currentUrl = slideUrls[currentIndex];
  const nextIndex = (currentIndex + 1) % slideUrls.length;
  const nextUrl = slideUrls[nextIndex];

  return (
    <div
      className="relative aspect-video overflow-hidden rounded-lg cursor-pointer hover:opacity-80 transition-opacity bg-muted"
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
  );
}

interface StageCardProps {
  stage: Stage;
  index: number;
  onStageClick?: (stage: Stage) => void;
  basePath?: string; // e.g., "/admin/content/curriculum"
  type?: "curriculum" | "certification";
  /** When true, thumbnail clicks navigate to stage page instead of topic */
  thumbnailClicksGoToStage?: boolean;
}

function StageCard({ stage, index, onStageClick, basePath, type = "curriculum", thumbnailClicksGoToStage = false }: StageCardProps) {
  const router = useRouter();
  const [isCardHovered, setIsCardHovered] = useState(false);

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
    ? topics.slice(0, 3)
    : topics.slice(0, 3); // Show 3 topics in a single row
  const hasMoreTopics = topics.length > displayedTopics.length;

  // Curriculum uses slug for pretty URLs; certification uses code
  const stageSegment = type === "curriculum"
    ? (stage as CurriculumStage).slug
    : (stage as CertificationStage).code;

  const handleTopicClick = (topic: TopicWithImage, e: React.MouseEvent) => {
    e.stopPropagation();
    if (thumbnailClicksGoToStage) {
      // Navigate to stage page (same as card header click)
      if (basePath) {
        router.push(`${basePath}/${stageSegment}`);
      } else if (onStageClick) {
        onStageClick(stage);
      }
      return;
    }
    if (basePath) {
      if (type === "certification") {
        // For certification topics, use slug if available, otherwise fallback to courseOrder
        const certTopic = topic as CertificationTopic & { slug?: string; courseOrder?: number | null };
        if (certTopic.slug) {
          router.push(`${basePath}/${stageSegment}/${certTopic.slug}`);
        } else if (certTopic.courseOrder !== null && certTopic.courseOrder !== undefined) {
          // Fallback to courseOrder for backward compatibility
          router.push(`${basePath}/${stageSegment}/T${certTopic.courseOrder}`);
        }
      } else {
        // For curriculum topics, use pretty slug from title (fallback to T{stageOrder} if no title)
        const topicSegment = topic.title?.trim()
          ? createSlug(topic.title)
          : topic.stageOrder != null
            ? `T${topic.stageOrder}`
            : null;
        if (topicSegment) {
          router.push(`${basePath}/${stageSegment}/${topicSegment}`);
        }
      }
    } else if (onStageClick) {
      // If no basePath, navigate to stage first
      onStageClick(stage);
    }
  };

  const stageHref = basePath ? `${basePath}/${stageSegment}` : null;

  const cardContent = (
    <Card
      className={cn(
        "relative pb-0 overflow-hidden transition-all duration-200 ease-out gap-3",
        onStageClick && "cursor-pointer hover:shadow-md",
        onStageClick && isCardHovered && "scale-[1.02] -translate-y-1 bg-[var(--brand-bullyproof-primary)]"
      )}
      onClick={stageHref ? undefined : () => onStageClick?.(stage)}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
    >
        <CardHeader className="py-0">
          <div className="space-y-0">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-xl">
                <BookOpen className={cn("h-5 w-5 flex-shrink-0 transition-all", isCardHovered && onStageClick ? "text-white animate-bounce-gentle" : "text-primary")} />
                <span className={cn(isCardHovered && onStageClick && "text-white")}>{stage.name}</span>
              </CardTitle>
              {!isLoadingTopics && (
                <span className={cn("text-xs whitespace-nowrap", isCardHovered && onStageClick ? "text-white/80" : "text-muted-foreground")}>
                  {topics.length} {topics.length === 1 ? "topic" : "topics"}
                </span>
              )}
            </div>
            {type === "curriculum" && (stage as CurriculumStage).years && (stage as CurriculumStage).years!.length > 0 && (
              <div className={cn("flex items-center gap-x-2 text-xs", isCardHovered && onStageClick ? "text-white/80" : "text-muted-foreground")}>
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
        <CardContent className="px-6 pt-2 pb-6">
          {isLoadingTopics ? (
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-lg" />
              ))}
            </div>
          ) : displayedTopics.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {displayedTopics.map((topic, topicIndex) => (
                <TopicImageThumbnail
                  key={topic.id}
                  topic={topic}
                  onTopicClick={thumbnailClicksGoToStage && stageHref ? () => {} : handleTopicClick}
                  index={topicIndex}
                  type={type}
                  isCardHovered={isCardHovered}
                />
              ))}
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              No topics available
            </div>
          )}
        </CardContent>
      </Card>
  );

  return (
    <div className={type === "certification" ? "md:col-span-2" : ""}>
      <StaggeredAnimation key={stage.id} index={index}>
        {stageHref && onStageClick ? (
          <Link href={stageHref} className="block">
            {cardContent}
          </Link>
        ) : (
          cardContent
        )}
      </StaggeredAnimation>
    </div>
  );
}

interface StageCardsProps {
  stages: Stage[];
  onStageClick?: (stage: Stage) => void;
  basePath?: string; // e.g., "/admin/content/curriculum"
  type?: "curriculum" | "certification";
  /** When true, thumbnail clicks navigate to stage page instead of topic */
  thumbnailClicksGoToStage?: boolean;
}

export function StageCards({
  stages,
  onStageClick,
  basePath,
  type = "curriculum",
  thumbnailClicksGoToStage = false,
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
          thumbnailClicksGoToStage={thumbnailClicksGoToStage}
        />
      ))}
    </div>
  );
}
