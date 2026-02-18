"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Loader2, CheckCheck } from "lucide-react";
import { compareSlidesByPosition } from "@/server/lib/fractional-position";
import { topicsApi } from "@/entities/topics/api/endpoints";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";
import { toStorageUrl } from "@/utils/supabase/storage-url";
import { getDisplayStatus, getStatusColors } from "@/utils/lesson-status";

// Format time as relative "time ago" string
function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const eventTime = new Date(timestamp);
  const diffInSeconds = Math.floor(
    (now.getTime() - eventTime.getTime()) / 1000
  );

  if (diffInSeconds < 60) {
    return "Just now";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    const weeks = Math.floor(diffInSeconds / 604800);
    return `${weeks}w ago`;
  }
}

// Format time as relative "time until" string (for future dates)
function formatTimeUntil(timestamp: string): string {
  const now = new Date();
  const eventTime = new Date(timestamp);
  const diffInSeconds = Math.floor(
    (eventTime.getTime() - now.getTime()) / 1000
  );

  if (diffInSeconds < 60) {
    return "in less than a minute";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `in ${minutes}m`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `in ${hours}h`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `in ${days}d`;
  } else {
    const weeks = Math.floor(diffInSeconds / 604800);
    return `in ${weeks}w`;
  }
}

// Live countdown component for scheduled lessons
function LiveCountdown({ scheduledFor }: { scheduledFor: string }) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const now = new Date();
    const eventTime = new Date(scheduledFor);
    return Math.floor((eventTime.getTime() - now.getTime()) / 1000);
  });

  useEffect(() => {
    const eventTime = new Date(scheduledFor);
    
    const updateTime = () => {
      const now = new Date();
      const diff = Math.floor((eventTime.getTime() - now.getTime()) / 1000);
      setTimeLeft(diff);
    };

    // Update immediately
    updateTime();

    // If under an hour, update every second; otherwise update every minute
    const intervalMs = timeLeft < 3600 ? 1000 : 60000;
    const interval = setInterval(updateTime, intervalMs);

    return () => clearInterval(interval);
  }, [scheduledFor, timeLeft < 3600]);

  // Format based on time remaining
  if (timeLeft <= 0) {
    return <span>now</span>;
  } else if (timeLeft < 60) {
    return <span className="tabular-nums">in {timeLeft}s</span>;
  } else if (timeLeft < 3600) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return (
      <span className="tabular-nums">
        in {minutes}m {seconds.toString().padStart(2, "0")}s
      </span>
    );
  } else if (timeLeft < 86400) {
    const hours = Math.floor(timeLeft / 3600);
    return <span>in {hours}h</span>;
  } else if (timeLeft < 604800) {
    const days = Math.floor(timeLeft / 86400);
    return <span>in {days}d</span>;
  } else {
    const weeks = Math.floor(timeLeft / 604800);
    return <span>in {weeks}w</span>;
  }
}

// Format status for display
function formatStatus(status: string): string {
  return status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getStatusHoverSurfaceBg(status: string): string {
  switch (status) {
    case "preparing":
      return "group-hover:bg-yellow-500/[0.01]";
    case "ready":
      return "group-hover:bg-green-500/[0.01]";
    case "scheduled":
      return "group-hover:bg-blue-500/[0.01]";
    case "overdue":
    case "in_progress":
      return "group-hover:bg-orange-500/[0.01]";
    case "feedback":
      return "group-hover:bg-purple-500/[0.01]";
    case "completed":
      return "group-hover:bg-gray-500/[0.01]";
    case "cancelled":
      return "group-hover:bg-red-500/[0.01]";
    default:
      return "group-hover:bg-gray-500/[0.01]";
  }
}

export type Lesson = {
  id: string;
  schoolId: string;
  topicId: string;
  createdByUserId: string | null;
  status: string;
  scheduledFor: string | null;
  createdAt: string;
  topic?: {
    title?: string;
    stageOrder?: number | null;
    stageId?: string;
    stageName?: string;
  } | null;
  teacher?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
  assignedClasses?: Array<{
    classId: string;
    className: string;
    classCode: string | null;
  }> | null;
};

// Component to handle topic thumbnail for lesson cards (matching lesson wizard style)
export function LessonTopicThumbnail({
  topicId,
  horizontal = false,
}: {
  topicId: string;
  horizontal?: boolean;
}) {
  const [hasError, setHasError] = useState(false);

  // Fetch topic with slides
  const { data: topicData, isLoading } = useQuery({
    queryKey: ["topic", topicId, "thumbnail"],
    queryFn: async () => {
      const result = await topicsApi.get.byId(topicId, {
        includeSlides: true,
        includeUrls: true,
      });
      if (result.error) {
        return null;
      }
      return result.data;
    },
    enabled: !!topicId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get first image slide
  const imageSlides = useMemo(() => {
    if (!topicData?.slides) return [];
    return topicData.slides
      .filter((slide: any) => slide.kind === "image")
      .sort(compareSlidesByPosition);
  }, [topicData?.slides]);

  const firstImageSlide = imageSlides[0];
  const slideId = firstImageSlide?.id;

  // Use signedUrl from API response (DB-cached)
  const imageUrl = firstImageSlide?.signedUrl || null;

  if (isLoading) {
    return (
      <div
        className={`${horizontal ? "h-full w-auto flex-shrink-0 aspect-video" : "w-full aspect-video"} ${horizontal ? "rounded-l-md" : "rounded-t-md"} bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center`}
      >
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasError || !imageUrl) {
    return (
      <div
        className={`${horizontal ? "h-full w-auto flex-shrink-0 aspect-video" : "w-full aspect-video"} ${horizontal ? "rounded-l-md" : "rounded-t-md"} bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center`}
      >
        <Image
          src="/images/bp-small-logo.svg"
          alt="Bullyproof Logo"
          width={48}
          height={48}
          className="h-12 w-12 object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative ${horizontal ? "h-full w-auto flex-shrink-0 aspect-video" : "w-full aspect-video"} ${horizontal ? "rounded-l-md" : "rounded-t-md"} overflow-hidden bg-muted`}
    >
      <Image
        src={toStorageUrl(imageUrl) ?? imageUrl}
        alt={topicData?.title || "Topic thumbnail"}
        fill
        className="object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export interface LessonCardProps {
  lesson: Lesson;
  schoolSlug: string;
  /** When true, renders as a non-clickable div instead of a link */
  displayOnly?: boolean;
  /** Enables stronger hover treatment used on the lessons page */
  enhancedHover?: boolean;
}

// Component to fetch and display lesson card with topic details
export function LessonCard({
  lesson,
  schoolSlug,
  displayOnly = false,
  enhancedHover = false,
}: LessonCardProps) {
  // Fetch topic details to get stageOrder and stage info
  const { data: topicData } = useQuery({
    queryKey: ["topic", lesson.topicId, "card-details"],
    queryFn: async () => {
      const result = await topicsApi.get.byId(lesson.topicId, {
        includeSlides: true,
        includeUrls: false,
      });
      if (result.error) {
        return null;
      }
      return result.data;
    },
    enabled: !!lesson.topicId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch stage data for stage name
  const { data: stageData } = useQuery({
    queryKey: ["stage", topicData?.stageId || lesson.topic?.stageId, "name"],
    queryFn: async () => {
      const stageId = topicData?.stageId || lesson.topic?.stageId;
      if (!stageId) return null;
      const result = await curriculumApi.stages.byId(stageId);
      if (result.error) return null;
      return result.data;
    },
    enabled: !!(topicData?.stageId || lesson.topic?.stageId),
    staleTime: 5 * 60 * 1000,
  });

  const stageOrder = topicData?.stageOrder ?? lesson.topic?.stageOrder ?? null;
  const stageName = stageData?.name || null;
  const topicTitle =
    topicData?.title || lesson.topic?.title || "Untitled Lesson";

  // Get teacher name
  const teacherName = lesson.teacher
    ? `${lesson.teacher.firstName || ""} ${lesson.teacher.lastName || ""}`.trim() ||
      lesson.teacher.email ||
      "Unknown"
    : "Unknown";

  // Get display status (raw and formatted)
  const rawDisplayStatus = getDisplayStatus(lesson.status, lesson.scheduledFor);
  const displayStatus = formatStatus(rawDisplayStatus);
  const { bg: statusBg, dot: statusDot, border: statusBorder } = getStatusColors(rawDisplayStatus);
  const isCompleted = rawDisplayStatus === "completed";
  const interactiveCardClasses = !displayOnly
    ? enhancedHover
      ? "group hover:shadow-md hover:scale-[1.02] hover:-translate-y-1.5 transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
      : "hover:shadow-md transition-shadow"
    : "";
  const enhancedSectionHoverClasses =
    !displayOnly && enhancedHover
      ? `transition-colors duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${getStatusHoverSurfaceBg(rawDisplayStatus)}`
      : "";

  const cardContent = (
    <Card className={`${interactiveCardClasses} h-full overflow-visible p-0 gap-0 flex flex-col relative border-0 shadow-none ${statusBg}`}>
        {/* CardHeader - Status and teacher info */}
        <CardHeader className={`py-3 px-4 bg-card/80 border border-b-0 rounded-t-lg flex flex-row justify-between items-center ${isCompleted ? '' : statusBorder} ${enhancedSectionHoverClasses}`}>
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            {isCompleted ? (
              <CheckCheck className="w-3 h-3" />
            ) : (
              <span className={`w-1.5 h-1.5 rounded-full ${statusDot} animate-pulse`} />
            )}
            {displayStatus}
          </span>
          <span className="text-xs text-muted-foreground">
            {teacherName} · {rawDisplayStatus === "scheduled" && lesson.scheduledFor
              ? <LiveCountdown scheduledFor={lesson.scheduledFor} />
              : formatTimeAgo(lesson.createdAt)}
          </span>
        </CardHeader>
        {/* CardContent - Thumbnail (maintaining aspect ratio, full width) */}
        <CardContent className={`p-0 flex-1 flex items-center justify-center bg-card/80 border-x relative z-[1] ${isCompleted ? '' : statusBorder}`}>
          {lesson.topicId && (
            <LessonTopicThumbnail topicId={lesson.topicId} horizontal={false} />
          )}
        </CardContent>
        {/* CardFooter - Details (stage, L badge, topic title, classes) */}
        <CardFooter className={`flex flex-col p-4 pt-3 gap-2 bg-card/80 border border-t-0 rounded-b-lg items-start ${isCompleted ? '' : statusBorder} ${enhancedSectionHoverClasses}`}>
          {/* Curriculum stage name */}
          {stageName && (
            <p className="text-xs font-medium text-muted-foreground">
              {stageName}
            </p>
          )}
          {/* Topic title with L badge */}
          <div className="flex items-center gap-2 min-w-0">
            {stageOrder !== null && stageOrder !== undefined && (
              <Badge
                variant="secondary"
                className="text-xs text-muted-foreground font-bold border-0 py-0 px-1.5 h-5 rounded-sm flex-shrink-0"
              >
                L{stageOrder}
              </Badge>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <CardTitle className="text-base font-semibold text-primary capitalize line-clamp-2 flex-1 cursor-default text-left">
                  {topicTitle}
                </CardTitle>
              </TooltipTrigger>
              <TooltipContent>
                <p>{topicTitle}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          {/* Classes */}
          {lesson.assignedClasses && lesson.assignedClasses.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {lesson.assignedClasses.map((classItem) => (
                <Badge
                  key={classItem.classId}
                  variant="outline"
                  className="text-xs py-0 px-1.5 h-5"
                >
                  {classItem.className}
                </Badge>
              ))}
            </div>
          )}
        </CardFooter>
      </Card>
  );

  return displayOnly ? (
    <div className="block">{cardContent}</div>
  ) : (
    <Link href={`/schools/${schoolSlug}/lessons/${lesson.id}`} className="block">
      {cardContent}
    </Link>
  );
}
