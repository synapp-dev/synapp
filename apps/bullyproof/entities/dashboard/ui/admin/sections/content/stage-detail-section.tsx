"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";
import { topicsApi } from "@/entities/topics/api/endpoints";
import type { curriculumStages, topics } from "@/server/db/schema";
import {
  useStageBySlug,
  useInvalidateStage,
} from "@/entities/stages/model/store";
import {
  useTopicsByStage,
  useInvalidateTopics,
} from "@/entities/topics/model/store-enhanced";
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
  Edit,
  Plus,
  FilePlus,
  Save,
  MoreVertical,
  Trash2,
  ChevronsLeft,
  ChevronsRight,
  GripHorizontal,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Skeleton } from "@workspace/ui/components/skeleton";
import Image from "next/image";
import Marquee from "react-fast-marquee";
import { EditStageSheet } from "./edit-stage-sheet";
import { AddTopicDrawer } from "./add-topic-drawer";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@workspace/ui/components/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import { AnimatedThumbnail } from "@/components/organisms/animated-thumbnail";
import { toStorageUrl } from "@/utils/supabase/storage-url";
import { createSlug } from "@/utils/slug";

// Component to handle thumbnail image with error fallback
function ThumbnailImage({ signedUrl, alt }: { signedUrl: string | null; alt: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !signedUrl) {
    return (
      <div className="w-24 h-14 flex-shrink-0 rounded-md bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center aspect-video">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative w-24 h-14 flex-shrink-0 rounded-md overflow-hidden bg-muted aspect-video">
      <Image
        src={toStorageUrl(signedUrl) ?? signedUrl}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

// Helper function to get slide stats
function getSlideStatsForCard(topic: TopicWithSlides) {
  // Sort slides by orderIndex to ensure correct order
  const slides = (topic.slides || []).sort(
    (a, b) => a.orderIndex - b.orderIndex
  );
  const totalSlides = slides.length;
  const imageSlides = slides.filter((s) => s.kind === "image").length;
  const videoSlides = slides.filter((s) => s.kind === "video").length;

  // Get all image slides sorted by orderIndex
  const imageSlidesList: TopicSlide[] = slides
    .filter((s) => s.kind === "image" && s.imageUrl)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((s) => ({
      id: s.id,
      orderIndex: s.orderIndex,
      kind: s.kind,
      imageUrl: s.imageUrl,
      signedUrl: s.signedUrl,
      topicId: s.topicId,
      videoUrl: s.videoUrl,
      textHtml: s.textHtml,
    }));

  return {
    totalSlides,
    imageSlides,
    videoSlides,
    imageSlidesList,
  };
}

// Animated topic card component similar to PDF library FolderCard
function TopicCard({
  topic,
  isHovered,
  isLeaving,
  hoveredSide,
  showPlaceholderOverlay,
  isDragHandleHovered,
  showDragHint,
  isDragActive,
  cardIndex,
  readonly = false,
  linkHref,
  onMouseEnter,
  onMouseLeave,
  onChevronHover,
  onChevronLeave,
  onDragHandleEnter,
  onDragHandleLeave,
  onClick,
  onAddTopicClick,
  onDeleteTopic,
  onAddSlideBefore,
  onAddSlideAfter,
}: {
  topic: TopicWithSlides;
  isHovered: boolean;
  isLeaving: boolean;
  hoveredSide: "left" | "right" | null;
  showPlaceholderOverlay: boolean;
  isDragHandleHovered: boolean;
  showDragHint: boolean;
  isDragActive: boolean;
  cardIndex: number;
  readonly?: boolean;
  linkHref?: string;
  onMouseEnter: () => void;
  onMouseLeave: (e?: React.MouseEvent) => void;
  onChevronHover: (side: "left" | "right") => void;
  onChevronLeave: () => void;
  onDragHandleEnter: () => void;
  onDragHandleLeave: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onAddTopicClick: (e: React.MouseEvent) => void;
  onDeleteTopic: () => void;
  onAddSlideBefore: () => void;
  onAddSlideAfter: () => void;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [shouldMarquee, setShouldMarquee] = useState(false);
  const shouldMarqueeRef = useRef(false);
  const titleRef = useRef<HTMLSpanElement>(null);
  const marqueeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Track drag active state with ref to prevent effect re-runs
  const isDragActiveRef = useRef(isDragActive);
  const prevIsDragActiveRef = useRef(isDragActive);
  useEffect(() => {
    // Only update if the value actually changed
    if (prevIsDragActiveRef.current !== isDragActive) {
      prevIsDragActiveRef.current = isDragActive;
    }
    isDragActiveRef.current = isDragActive;
  }, [isDragActive]);

  useEffect(() => {
    // Don't check overflow during drag to prevent infinite loops - check both ref and prop
    // Skip entirely if dragging to avoid any setup
    if (isDragActiveRef.current || isDragActive) {
      return;
    }

    // Check if text overflows and needs marquee
    const checkOverflow = () => {
      // Don't update state during drag - double check (in case drag started during timeout)
      if (isDragActiveRef.current || isDragActive) {
        return;
      }

      if (titleRef.current && marqueeContainerRef.current && isMounted) {
        const textWidth = titleRef.current.scrollWidth;
        const containerWidth = marqueeContainerRef.current.clientWidth;
        const needsMarquee = textWidth > containerWidth;
        // Only update state if the value actually changed to prevent unnecessary re-renders
        if (needsMarquee !== shouldMarqueeRef.current) {
          shouldMarqueeRef.current = needsMarquee;
          setShouldMarquee(needsMarquee);
        }
      }
    };

    // Use setTimeout to ensure DOM is ready
    const timeoutId = setTimeout(checkOverflow, 0);
    // Also check on window resize
    window.addEventListener("resize", checkOverflow);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [topic.title, isMounted, isDragActive]);

  const { totalSlides, imageSlides, videoSlides, imageSlidesList } =
    getSlideStatsForCard(topic);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: topic.id,
    disabled: topic.id.startsWith("temp_") || readonly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const rootClassName = "flex flex-col relative w-full";

  const innerContent = (
    <>
      {/* Placeholder Overlay - shows on adjacent card when hovering chevron */}
      {showPlaceholderOverlay && (
        <div className="absolute inset-0 z-20 pointer-events-none animate-in fade-in duration-200">
          {/* Background layer to hide the card behind */}
          <div className="absolute inset-0 bg-background rounded-lg" />

          {/* New Topic placeholder layer with pulse animation */}
          <Card className="relative p-0 overflow-hidden gap-0 flex flex-col border-2 border-dashed border-primary/70 bg-primary/10 h-full animate-pulse">
            <div className="relative w-full aspect-video overflow-hidden bg-primary/5 flex items-center justify-center">
              <Plus className="h-12 w-12 text-primary/40" />
            </div>
            <div className="w-full text-xs font-medium px-4 py-2 flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary/70">
              <span className="text-xs">New Topic</span>
            </div>
          </Card>
        </div>
      )}

      {/* Drag Handle Tab - appears on hover or when dragging, top right corner */}
      {!readonly &&
        !topic.id.startsWith("temp_") &&
        ((isHovered && !isDragging) || isDragHandleHovered || isLeaving) && (
          <div className="absolute top-0 right-0 z-30 flex items-center gap-2">
            {/* Drag hint text */}
            {showDragHint && (
              <div
                className={`
                  flex items-center text-xs text-secondary font-medium whitespace-nowrap ${
                    isLeaving
                      ? "opacity-0 -translate-x-4 transition-all duration-300"
                      : ""
                  }`}
                style={
                  !isLeaving && showDragHint
                    ? {
                        animation:
                          "slide-left-fade-in 0.3s ease-out forwards, bounce-right 1s ease-in-out infinite 0.3s",
                      }
                    : undefined
                }
              >
                <span>drag to reorder</span>
                <ChevronsRight className="h-3.5 w-3.5" />
              </div>
            )}
            <div
              {...attributes}
              {...listeners}
              data-drag-handle
              onMouseEnter={(e) => {
                e.stopPropagation();
                // Don't handle mouse enter during drag
                if (isDragActive) return;
                onDragHandleEnter();
              }}
              onMouseLeave={(e) => {
                // Don't handle mouse leave during drag
                if (isDragActive) return;
                onDragHandleLeave(e);
              }}
              className={`bg-muted border-2 border-primary/50 border-t-0 border-r-0 rounded-bl-lg rounded-tr-lg px-4 py-1.5 cursor-grab active:cursor-grabbing shadow-lg hover:shadow-xl hover:bg-muted/80 ${
                isLeaving
                  ? "opacity-0 scale-95 translate-y-2 transition-all duration-300"
                  : "opacity-0 scale-95 animate-slide-down-fade-in"
              }`}
              style={{
                boxShadow:
                  "0 -2px 8px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            >
              <GripHorizontal className="h-4 w-4 text-primary/70" />
            </div>
          </div>
        )}

      {/* Topic Card */}
      <Card
        data-topic-card={topic.id}
        onMouseEnter={() => {
          // Don't handle mouse enter during drag
          if (isDragActive) return;
          onMouseEnter();
        }}
        onMouseLeave={(e) => {
          // Don't handle mouse leave during drag
          if (isDragActive) return;

          // Check if we're moving to a child element (drag handle or card content)
          const relatedTarget = e?.relatedTarget as Node | null;
          const isMovingToChild =
            relatedTarget instanceof Element &&
            (relatedTarget.closest("[data-drag-handle]") ||
              relatedTarget.closest(`[data-topic-card="${topic.id}"]`));

          // Only reset if we're actually leaving the card area, not moving to a child
          if (!isMovingToChild) {
            onMouseLeave(e);
          }
        }}
        className={`
          relative transition-all hover:shadow-md p-0 overflow-hidden gap-0 flex flex-col
          ${isDragging ? "z-50" : ""}
          ${topic.id.startsWith("temp_") ? "border-2 border-dashed border-primary/50 cursor-default" : "cursor-pointer"}
          ${showPlaceholderOverlay ? "opacity-50" : ""}
        `}
        onClick={(e) => {
          // Don't navigate if dragging
          if (!isDragging) {
            onClick(e);
          }
        }}
      >
        {/* Hover Overlay with Chevrons */}
        {!readonly &&
          (isHovered || isLeaving) &&
          !topic.id.startsWith("temp_") &&
          !isDragging && (
            <div className="absolute top-0 left-0 right-0 bottom-4 z-10 flex items-center justify-between pointer-events-none">
              {/* Left Chevron */}
              <div className="h-full w-1/2 flex items-center justify-start pl-2">
                <div
                  className={`
                  flex items-center justify-center rounded-lg bg-muted backdrop-blur-sm border-2 border-primary shadow-lg transition-all duration-300 cursor-pointer pointer-events-auto relative ${
                    isLeaving
                      ? "opacity-0 scale-95 translate-x-2 transition-all duration-300"
                      : "opacity-0 scale-95 animate-slide-right-fade-in"
                  }
                  ${hoveredSide === "left" ? "scale-110 border-primary" : "border-primary/50 hover:scale-105"}
                `}
                  style={{ width: "32px", height: "32px" }}
                  onMouseEnter={() => onChevronHover("left")}
                  onMouseLeave={onChevronLeave}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddTopicClick(e);
                  }}
                >
                  <ChevronsLeft
                    className={`
                    h-4 w-4 transition-all duration-200 absolute
                    ${hoveredSide === "left" ? "opacity-0 scale-0" : "opacity-100 scale-100"}
                    ${hoveredSide === "left" ? "text-primary" : "text-primary/70"}
                  `}
                  />
                  <FilePlus
                    className={`
                    h-4 w-4 transition-all duration-200 absolute
                    ${hoveredSide === "left" ? "opacity-100 scale-100" : "opacity-0 scale-0"}
                    text-primary
                  `}
                  />
                </div>
              </div>

              {/* Right Chevron */}
              <div className="h-full w-1/2 flex items-center justify-end pr-2">
                <div
                  className={`
                  flex items-center justify-center rounded-lg bg-muted backdrop-blur-sm border-2 border-primary shadow-lg transition-all duration-300 cursor-pointer pointer-events-auto relative ${
                    isLeaving
                      ? "opacity-0 scale-95 -translate-x-2 transition-all duration-300"
                      : "opacity-0 scale-95 animate-slide-left-fade-in"
                  }
                  ${hoveredSide === "right" ? "scale-110 border-primary" : "border-primary/50 hover:scale-105"}
                `}
                  style={{ width: "32px", height: "32px" }}
                  onMouseEnter={() => onChevronHover("right")}
                  onMouseLeave={onChevronLeave}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddTopicClick(e);
                  }}
                >
                  <ChevronsRight
                    className={`
                    h-4 w-4 transition-all duration-200 absolute
                    ${hoveredSide === "right" ? "opacity-0 scale-0" : "opacity-100 scale-100"}
                    ${hoveredSide === "right" ? "text-primary" : "text-primary/70"}
                  `}
                  />
                  <FilePlus
                    className={`
                    h-4 w-4 transition-all duration-200 absolute
                    ${hoveredSide === "right" ? "opacity-100 scale-100" : "opacity-0 scale-0"}
                    text-primary
                  `}
                  />
                </div>
              </div>
            </div>
          )}
        {/* Animated Thumbnail */}
        <div className="relative w-full aspect-video overflow-hidden bg-muted">
          {imageSlidesList.length > 0 ? (
            <>
              <AnimatedThumbnail
                imageSlidesList={imageSlidesList}
                topicTitle={topic.title}
                cardIndex={cardIndex}
                isPaused={!isHovered || isDragActive}
                isCertification={false}
              />
              {/* Dimming overlay when hovered */}
              {!readonly &&
                (isHovered || isLeaving) &&
                !topic.id.startsWith("temp_") &&
                !isDragging && (
                  <div
                    className={`absolute inset-0 transition-all duration-300 ${
                      showDragHint ? "bg-black/80" : "bg-black/10"
                    } ${isLeaving ? "opacity-0" : "opacity-100"}`}
                  />
                )}
              {/* Topic title overlay - appears when drag hint is shown */}
              {!readonly &&
                showDragHint &&
                !topic.id.startsWith("temp_") &&
                !isDragging && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[70%] px-4 py-3 pointer-events-none">
                    <span
                      className={`text-sm font-medium text-secondary text-center block capitalize ${
                        isLeaving
                          ? "opacity-0 translate-y-2 transition-all duration-300"
                          : "opacity-0 translate-y-2 animate-slide-up-fade-in"
                      }`}
                    >
                      {topic.title}
                    </span>
                  </div>
                )}
            </>
          ) : (
            <>
              <div className="w-full h-full flex items-center justify-center">
                <Image
                  src="/images/bp-small-logo.svg"
                  alt="Bullyproof Logo"
                  width={48}
                  height={48}
                  className="h-12 w-12 object-contain"
                />
              </div>
              {/* Dimming overlay when hovered */}
              {!readonly &&
                (isHovered || isLeaving) &&
                !topic.id.startsWith("temp_") &&
                !isDragging && (
                  <div
                    className={`absolute inset-0 transition-all duration-300 ${
                      showDragHint ? "bg-black/80" : "bg-black/10"
                    } ${isLeaving ? "opacity-0" : "opacity-100"}`}
                  />
                )}
              {/* Topic title overlay - appears when drag hint is shown */}
              {!readonly &&
                showDragHint &&
                !topic.id.startsWith("temp_") &&
                !isDragging && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[70%] px-4 py-3 pointer-events-none">
                    <span
                      className={`text-sm font-medium text-secondary text-center block capitalize ${
                        isLeaving
                          ? "opacity-0 translate-y-2 transition-all duration-300"
                          : "opacity-0 translate-y-2 animate-slide-up-fade-in"
                      }`}
                    >
                      {topic.title}
                    </span>
                  </div>
                )}
            </>
          )}
        </div>

        {/* Footer with topic info */}
        <div className="w-full text-xs font-medium px-4 py-2 flex items-center justify-between flex-shrink-0 bg-muted text-primary">
          {showDragHint ? (
            // Show slide counts when in drag mode
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-muted-foreground">
                {totalSlides} {totalSlides === 1 ? "slide" : "slides"}
              </span>

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
          ) : (
            // Normal mode: show order number in blue bold text and topic title
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {topic.stageOrder !== null && (
                <span className="text-blue-500 font-bold text-xs flex-shrink-0">
                  {topic.stageOrder}
                </span>
              )}
              <div
                ref={marqueeContainerRef}
                className="min-w-0 flex-1 overflow-hidden relative"
              >
                {/* Hidden element to measure text width */}
                {isMounted && (
                  <span
                    ref={titleRef}
                    className="font-medium capitalize invisible absolute whitespace-nowrap pointer-events-none"
                    aria-hidden="true"
                    style={{ visibility: "hidden" }}
                  >
                    {topic.title}
                  </span>
                )}
                {isMounted && shouldMarquee ? (
                  <Marquee
                    speed={30}
                    gradient={false}
                    pauseOnHover={true}
                    className="font-medium capitalize"
                  >
                    <span className="px-6">{topic.title}</span>
                  </Marquee>
                ) : (
                  <span className="font-medium capitalize truncate block">
                    {topic.title}
                  </span>
                )}
              </div>
              {topic.id.startsWith("temp_") && (
                <Badge
                  variant="outline"
                  className="text-xs px-1 py-0 h-4 flex-shrink-0"
                >
                  New
                </Badge>
              )}
            </div>
          )}
          {/* Dropdown menu - only visible if not readonly */}
          {!readonly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-background/50 transition-colors ml-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
                data-dropdown-menu
              >
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddSlideBefore();
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add slide before
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddSlideAfter();
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add slide after
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTopic();
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete topic
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </Card>
    </>
  );

  return linkHref ? (
    <Link href={linkHref} className={rootClassName} prefetch>
      {innerContent}
    </Link>
  ) : (
    <div ref={setNodeRef} style={style} className={rootClassName}>
      {innerContent}
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
  kind: string; // "text" | "image" | "video" from schema
  imageUrl: string | null;
  videoUrl: string | null;
  textHtml: string | null;
  signedUrl?: string | null;
};

type TopicWithSlides = Topic & {
  slides?: TopicSlide[];
};

interface StageDetailSectionProps {
  slug: string;
  readonly?: boolean;
  basePath?: string; // e.g., "/admin/content/curriculum" or "/schools/{schoolId}/content"
  onBackClick?: () => void; // Optional custom back navigation
}

export function StageDetailSection({
  slug,
  readonly = false,
  basePath = "/admin/content/curriculum",
  onBackClick,
}: StageDetailSectionProps) {
  const router = useRouter();
  const [localTopics, setLocalTopics] = useState<TopicWithSlides[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isAddTopicDrawerOpen, setIsAddTopicDrawerOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredSide, setHoveredSide] = useState<"left" | "right" | null>(null);
  const [hoveredDragHandle, setHoveredDragHandle] = useState<string | null>(
    null
  );
  const [leavingIndex, setLeavingIndex] = useState<number | null>(null);
  const [showDragHintIndex, setShowDragHintIndex] = useState<number | null>(
    null
  );
  const [hoveredReadonlyIndex, setHoveredReadonlyIndex] =
    useState<number | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveDelayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragHintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Use new stores
  const {
    stage,
    isLoading,
    error: stageError,
    refetch: refetchStage,
  } = useStageBySlug(slug);

  const {
    topics,
    isLoading: isLoadingTopics,
    refetch: refetchTopics,
  } = useTopicsByStage(stage?.id, {
    includeSlides: true,
    includeUrls: true,
  });

  const { invalidateStage } = useInvalidateStage();
  const { invalidateTopicsByStage } = useInvalidateTopics();

  // Trigger background refetch on mount to ensure complete data
  // This ensures that even if we navigated from a topic page that only cached
  // a single stage/topic, we'll fetch complete data in the background while showing cached data
  useEffect(() => {
    if (stage?.id) {
      // Refetch stage and topics in the background without blocking the UI
      // The cached data will display immediately, and the UI will update when fresh data arrives
      refetchStage();
      refetchTopics();
    }
  }, [stage?.id, refetchStage, refetchTopics]);

  // Set error from stage query - only after loading completes
  useEffect(() => {
    // Don't set errors while still loading
    if (isLoading || isLoadingTopics) {
      return;
    }
    
    if (stageError) {
      setError(
        stageError.message || "Failed to fetch curriculum stage details"
      );
    } else {
      setError(null);
    }
  }, [stageError, isLoading, isLoadingTopics]);

  // Sync localTopics with topics when topics change (but not when we're reordering)
  // Use topic IDs string for comparison to avoid infinite loops from array reference changes
  const topicIdsString = useMemo(
    () => topics.map((t) => t.id).join(","),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topics.map((t) => t.id).join(",")]
  );
  const prevTopicIdsRef = useRef<string>("");

  useEffect(() => {
    if (!hasUnsavedChanges && topics.length > 0) {
      // Only update if topic IDs have actually changed
      if (topicIdsString !== prevTopicIdsRef.current) {
        prevTopicIdsRef.current = topicIdsString;
        // Type assertion needed due to slight type differences between store and local types
        setLocalTopics(topics as TopicWithSlides[]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicIdsString, hasUnsavedChanges]);

  const handleStageUpdated = () => {
    invalidateStage(stage?.id || "");
    refetchStage();
  };

  const handleStageDeleted = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.push(basePath);
    }
  };

  const handleTopicClick = (
    topic: TopicWithSlides,
    event?: React.MouseEvent
  ) => {
    // Don't navigate if we're dragging or if it's a temp topic
    if ((!readonly && activeId) || topic.id.startsWith("temp_")) return;

    // Don't navigate if clicking on dropdown menu
    if (
      event &&
      (event.target as HTMLElement).closest("[data-dropdown-menu]")
    ) {
      return;
    }

    // Navigate to topic page using pretty slug from title (fallback to T{stageOrder})
    const topicSegment = topic.title?.trim()
      ? createSlug(topic.title)
      : topic.stageOrder != null
        ? `T${topic.stageOrder}`
        : null;
    if (topicSegment) {
      router.push(`${basePath}/${slug}/${topicSegment}`);
    }
  };

  const handleDeleteTopic = async (topic: TopicWithSlides) => {
    if (
      !confirm(
        `Are you sure you want to delete "${topic.title}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const result = await topicsApi.delete.delete(topic.id);
      if (result.error) {
        toast.error(result.error.message || "Failed to delete topic");
        return;
      }

      // Invalidate cache and refetch
      invalidateTopicsByStage(stage?.id || "");
      refetchTopics();
      setLocalTopics((prev) => prev.filter((t) => t.id !== topic.id));
      setHasUnsavedChanges(false);
      toast.success("Topic deleted successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete topic"
      );
    }
  };

  const handleAddSlideBefore = (topic: TopicWithSlides) => {
    // Navigate to topic page - the topic editor should handle adding slide at position 0
    const topicSegment = topic.title?.trim()
      ? createSlug(topic.title)
      : topic.stageOrder != null
        ? `T${topic.stageOrder}`
        : null;
    if (topicSegment) {
      router.push(`${basePath}/${slug}/${topicSegment}`);
    }
  };

  const handleAddSlideAfter = (topic: TopicWithSlides) => {
    // Navigate to topic page - the topic editor should handle adding slide at the end
    const topicSegment = topic.title?.trim()
      ? createSlug(topic.title)
      : topic.stageOrder != null
        ? `T${topic.stageOrder}`
        : null;
    if (topicSegment) {
      router.push(`${basePath}/${slug}/${topicSegment}`);
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

    return {
      totalSlides,
      imageSlides,
      videoSlides,
      firstImageSlide,
    };
  };

  // Drag and drop handlers with dnd-kit
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
      // Clear hover states when drag ends
      setHoveredIndex(null);
      setHoveredSide(null);
      setHoveredDragHandle(null);
      setLeavingIndex(null);
      setShowDragHintIndex(null);
      if (dragHintTimeoutRef.current) {
        clearTimeout(dragHintTimeoutRef.current);
        dragHintTimeoutRef.current = null;
      }
      return;
    }

    const activeIndex = localTopics.findIndex((t) => t.id === active.id);
    const overIndex = localTopics.findIndex((t) => t.id === over.id);

    if (activeIndex === -1 || overIndex === -1) {
      setActiveId(null);
      // Clear hover states when drag ends
      setHoveredIndex(null);
      setHoveredSide(null);
      setHoveredDragHandle(null);
      setLeavingIndex(null);
      setShowDragHintIndex(null);
      if (dragHintTimeoutRef.current) {
        clearTimeout(dragHintTimeoutRef.current);
        dragHintTimeoutRef.current = null;
      }
      return;
    }

    // Reorder topics using arrayMove
    const newTopics = arrayMove(localTopics, activeIndex, overIndex);

    // Update stageOrder for all topics
    const reorderedTopics = newTopics.map((topic, index) => ({
      ...topic,
      stageOrder: index + 1,
    }));

    setLocalTopics(reorderedTopics);
    setHasUnsavedChanges(true);
    setActiveId(null);
    // Clear hover states when drag ends
    setHoveredIndex(null);
    setHoveredSide(null);
    setHoveredDragHandle(null);
    setLeavingIndex(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    // Clear hover states when drag is cancelled
    setHoveredIndex(null);
    setHoveredSide(null);
    setHoveredDragHandle(null);
    setLeavingIndex(null);
    setShowDragHintIndex(null);
    if (dragHintTimeoutRef.current) {
      clearTimeout(dragHintTimeoutRef.current);
      dragHintTimeoutRef.current = null;
    }
    if (leaveDelayTimeoutRef.current) {
      clearTimeout(leaveDelayTimeoutRef.current);
      leaveDelayTimeoutRef.current = null;
    }
  };

  // Handle adding new topic
  const handleTopicAdded = async (newTopic: TopicWithSlides) => {
    // Optimistically add to Zustand store for immediate UI update
    if (stage?.id && newTopic) {
      // Invalidate TQ cache so the new topic appears in the list
      invalidateTopicsByStage(stage.id);
    }
    
    // Invalidate React Query cache
    if (stage?.id) {
      invalidateTopicsByStage(stage.id);
      invalidateStage(stage.id);
    }
    
    // Refetch in background to ensure data is in sync
    refetchTopics();
    refetchStage();
  };

  // Handle saving changes
  const handleSaveChanges = async () => {
    if (!stage?.id || isSaving) return;

    setIsSaving(true);
    try {
      // Separate existing topics from new topics
      const existingTopics = localTopics.filter(
        (t) => !t.id.startsWith("temp_")
      );
      const newTopics = localTopics.filter((t) => t.id.startsWith("temp_"));

      // First, create new topics
      const createdTopics: TopicWithSlides[] = [];
      for (const newTopic of newTopics) {
        const result = await topicsApi.post.create({
          stageId: stage.id,
          title: newTopic.title,
          officialNotes: newTopic.officialNotes || undefined,
        });

        if (result.data) {
          createdTopics.push(result.data as TopicWithSlides);
        }
      }

      // Combine existing and newly created topics
      const allTopics = [...existingTopics, ...createdTopics];

      // Reorder all topics
      const topicIds = allTopics
        .sort((a, b) => {
          const aOrder = a.stageOrder || 0;
          const bOrder = b.stageOrder || 0;
          return aOrder - bOrder;
        })
        .map((t) => t.id);

      if (topicIds.length > 0) {
        const reorderResult = await topicsApi.reorder({
          stageId: stage.id,
          topicIds,
        });

        if (reorderResult.error) {
          throw new Error(
            reorderResult.error.message || "Failed to reorder topics"
          );
        }
      }

      // Invalidate cache and refetch topics
      invalidateTopicsByStage(stage.id);
      await refetchTopics();
      // Update localTopics from the refetched data
      if (topics.length > 0) {
        // Type assertion needed due to slight type differences between store and local types
        setLocalTopics(topics as TopicWithSlides[]);
      }

      setHasUnsavedChanges(false);
      toast.success("Topics saved successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save topics");
    } finally {
      setIsSaving(false);
    }
  };

  // Get display topics (localTopics if we have unsaved changes, otherwise topics)
  const displayTopics = hasUnsavedChanges ? localTopics : topics;

  // Memoize isDragActive to prevent unnecessary re-renders during rapid drags
  const isDragActive = useMemo(() => activeId !== null, [activeId]);

  // Show skeleton loaders only if we have no cached data
  // If we have cached data, show it immediately while refetching in background
  const showSkeletons = (isLoading || isLoadingTopics) && !stage;

  // Only show errors after loading completes
  if (error && !isLoading && !isLoadingTopics) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => {
            if (onBackClick) {
              onBackClick();
            } else {
              router.push(basePath);
            }
          }}
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

  // Show skeleton loaders when loading and no cached data
  if (showSkeletons) {
    return (
      <div className="space-y-6">
        {/* Stage Header Skeleton - Sticky */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-2">
          <div className="flex items-center gap-3 flex-wrap">
            <Skeleton className="h-6 w-6 rounded-md flex-shrink-0" />
            <Skeleton className="h-9 w-48" />
          </div>
        </div>

        {/* Topics Section Skeleton */}
        <div className="flex flex-col h-[calc(100vh-250px)]">
          {/* Topics Header Skeleton */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-7 w-20" />
            </div>
          </div>

          {/* Scrollable Topics Grid Skeleton */}
          <ScrollArea className="flex-1 pr-4">
            <div className="pr-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Card
                    key={i}
                    className="p-0 overflow-hidden gap-0 flex flex-col"
                  >
                    <Skeleton className="w-full aspect-video" />
                    <div className="w-full px-4 py-2 flex items-center justify-between bg-muted">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  // Only check for missing stage after loading completes
  if (!stage && !isLoading && !isLoadingTopics) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => {
            if (onBackClick) {
              onBackClick();
            } else {
              router.push(basePath);
            }
          }}
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
    <div className="space-y-2">
      {/* Stage Header - Sticky */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary flex-shrink-0" />
              <h1 className="text-3xl font-bold tracking-tight">
                {stage.name}
              </h1>
            </div>
            {stage.years && stage.years.length > 0 && (
              <div className="flex items-center gap-x-2 text-xs text-muted-foreground">
                {stage.years
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
          {!readonly && hasUnsavedChanges && (
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          )}
          {!readonly && !hasUnsavedChanges && stage && (
            <Button onClick={() => setIsAddTopicDrawerOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Topic
            </Button>
          )}
        </div>
      </div>

      {/* Topics Section */}
      <div className="flex flex-col h-full">
        {/* Topics Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"></div>
        </div>

        {/* Scrollable Topics Grid */}
        <ScrollArea className="flex-1 pr-4">
          <div className="pr-4">
            {isLoadingTopics && displayTopics.length === 0 ? (
              // Show skeleton loaders for topics when loading and no cached topics
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Card
                    key={i}
                    className="p-0 overflow-hidden gap-0 flex flex-col"
                  >
                    <Skeleton className="w-full aspect-video" />
                    <div className="w-full px-4 py-2 flex items-center justify-between bg-muted">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : displayTopics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No topics found for this stage.</p>
              </div>
            ) : readonly ? (
              // Read-only mode: simple grid without drag/drop
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayTopics.map((topic, index) => {
                  const topicLinkHref = (() => {
                    const segment = topic.title?.trim()
                      ? createSlug(topic.title)
                      : topic.stageOrder != null
                        ? `T${topic.stageOrder}`
                        : null;
                    return segment ? `${basePath}/${slug}/${segment}` : undefined;
                  })();
                  return (
                    <StaggeredAnimation
                      key={topic.id}
                      index={index}
                      incrementDelay={0.075}
                    >
                      <TopicCard
                        topic={topic}
                        isHovered={hoveredReadonlyIndex === index}
                        isLeaving={false}
                        hoveredSide={null}
                        showPlaceholderOverlay={false}
                        isDragHandleHovered={false}
                        showDragHint={false}
                        isDragActive={false}
                        cardIndex={index}
                        readonly={true}
                        linkHref={topicLinkHref}
                        onMouseEnter={() => setHoveredReadonlyIndex(index)}
                        onMouseLeave={() => setHoveredReadonlyIndex(null)}
                        onChevronHover={() => {}}
                        onChevronLeave={() => {}}
                        onDragHandleEnter={() => {}}
                        onDragHandleLeave={() => {}}
                        onClick={
                          topicLinkHref
                            ? () => {}
                            : (e) => handleTopicClick(topic, e)
                        }
                        onAddTopicClick={() => {}}
                        onDeleteTopic={() => {}}
                        onAddSlideBefore={() => {}}
                        onAddSlideAfter={() => {}}
                      />
                    </StaggeredAnimation>
                  );
                })}
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={displayTopics.map((t) => t.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {displayTopics.map((topic, index) => {
                      const isHovered = hoveredIndex === index && !activeId;
                      const isLeaving = leavingIndex === index && !activeId;
                      // Determine if this card should show the placeholder overlay
                      const showPlaceholderOverlay =
                        !activeId &&
                        ((hoveredIndex === index - 1 &&
                          hoveredSide === "right") ||
                          (hoveredIndex === index + 1 &&
                            hoveredSide === "left"));

                      return (
                        <StaggeredAnimation
                          key={topic.id}
                          index={index}
                          incrementDelay={0.075}
                        >
                          <TopicCard
                            topic={topic}
                            isHovered={isHovered}
                            isLeaving={isLeaving}
                            hoveredSide={hoveredSide}
                            showPlaceholderOverlay={showPlaceholderOverlay}
                            isDragHandleHovered={hoveredDragHandle === topic.id}
                            showDragHint={showDragHintIndex === index}
                            isDragActive={isDragActive}
                            cardIndex={index}
                            readonly={false}
                            onMouseEnter={() => {
                              // Skip all hover logic during drag or in readonly mode
                              if (activeId || readonly) return;

                              // Clear any leave timeout from previous card
                              if (leaveDelayTimeoutRef.current) {
                                clearTimeout(leaveDelayTimeoutRef.current);
                                leaveDelayTimeoutRef.current = null;
                              }
                              // Clear drag hint timeout from previous card
                              if (dragHintTimeoutRef.current) {
                                clearTimeout(dragHintTimeoutRef.current);
                                dragHintTimeoutRef.current = null;
                              }
                              // Clear leaving state immediately when entering new card
                              setLeavingIndex(null);
                              setShowDragHintIndex(null);

                              // Clear previous card's hover states (including drag handle)
                              if (
                                hoveredIndex !== null &&
                                hoveredIndex !== index
                              ) {
                                setHoveredIndex(null);
                                setHoveredSide(null);
                                setHoveredDragHandle(null);
                              }

                              // Set hover state immediately
                              setHoveredIndex(index);

                              // Show drag hint after 1 second
                              dragHintTimeoutRef.current = setTimeout(() => {
                                setShowDragHintIndex(index);
                              }, 1000);
                            }}
                            onMouseLeave={(e) => {
                              // Skip all hover logic during drag or in readonly mode
                              if (activeId || readonly) return;

                              // Check if we're moving to a child element (drag handle) or another card
                              const relatedTarget =
                                e?.relatedTarget as Node | null;
                              const isMovingToDragHandle =
                                relatedTarget instanceof Element &&
                                relatedTarget.closest("[data-drag-handle]");
                              const isMovingToAnotherCard =
                                relatedTarget instanceof Element &&
                                relatedTarget.closest("[data-topic-card]");

                              // If moving to drag handle, keep hover states (don't clear)
                              if (isMovingToDragHandle) {
                                // Keep hover states when moving to drag handle
                                return;
                              }

                              // If moving to another card, clear this card's states
                              if (isMovingToAnotherCard) {
                                setHoveredIndex(null);
                                setHoveredSide(null);
                                setLeavingIndex(null);
                                setShowDragHintIndex(null);
                                // Clear drag hint timeout
                                if (dragHintTimeoutRef.current) {
                                  clearTimeout(dragHintTimeoutRef.current);
                                  dragHintTimeoutRef.current = null;
                                }
                                if (hoveredDragHandle === topic.id) {
                                  setHoveredDragHandle(null);
                                }
                                return;
                              }

                              // Clear drag hint timeout
                              if (dragHintTimeoutRef.current) {
                                clearTimeout(dragHintTimeoutRef.current);
                                dragHintTimeoutRef.current = null;
                              }

                              // Set leaving state to trigger fade-out animation only if truly leaving
                              if (isHovered) {
                                setLeavingIndex(index);
                                setShowDragHintIndex(null);
                                // After animation completes, clear all states
                                leaveDelayTimeoutRef.current = setTimeout(
                                  () => {
                                    setHoveredIndex(null);
                                    setHoveredSide(null);
                                    setLeavingIndex(null);
                                    // Also clear drag handle hover if we're leaving the card
                                    if (hoveredDragHandle === topic.id) {
                                      setHoveredDragHandle(null);
                                    }
                                    leaveDelayTimeoutRef.current = null;
                                  },
                                  500
                                ); // Match animation duration
                              } else {
                                // If not hovered, clear immediately
                                setHoveredIndex(null);
                                setHoveredSide(null);
                                setShowDragHintIndex(null);
                                if (hoveredDragHandle === topic.id) {
                                  setHoveredDragHandle(null);
                                }
                              }
                            }}
                            onChevronHover={(side) => {
                              if (!activeId) {
                                setHoveredSide(side);
                              }
                            }}
                            onChevronLeave={() => {
                              setHoveredSide(null);
                            }}
                            onDragHandleEnter={() => {
                              // Don't update hover states during drag or in readonly mode
                              if (activeId || readonly) return;

                              // Only update if values actually need to change to prevent unnecessary re-renders
                              if (hoveredDragHandle !== topic.id) {
                                setHoveredDragHandle(topic.id);
                              }
                              if (hoveredIndex !== index) {
                                setHoveredIndex(index);
                              }
                              if (showDragHintIndex !== index) {
                                setShowDragHintIndex(index);
                              }
                            }}
                            onDragHandleLeave={(e) => {
                              // Don't update hover states during drag or in readonly mode
                              if (activeId || readonly) return;

                              const relatedTarget =
                                e.relatedTarget as Node | null;
                              const isMovingToThisCard =
                                relatedTarget instanceof Element &&
                                relatedTarget.closest(
                                  `[data-topic-card="${topic.id}"]`
                                );
                              const isMovingToAnyCard =
                                relatedTarget instanceof Element &&
                                relatedTarget.closest("[data-topic-card]");

                              // If moving to this card, keep hover states (including drag hint)
                              if (isMovingToThisCard) {
                                return;
                              }

                              // If moving to another card, clear this card's hover states immediately
                              if (isMovingToAnyCard) {
                                setHoveredDragHandle(null);
                                setHoveredIndex(null);
                                setHoveredSide(null);
                                setLeavingIndex(null);
                                setShowDragHintIndex(null);
                                if (dragHintTimeoutRef.current) {
                                  clearTimeout(dragHintTimeoutRef.current);
                                  dragHintTimeoutRef.current = null;
                                }
                                return;
                              }

                              // If not moving to any card, clear everything
                              setHoveredDragHandle(null);
                              setHoveredIndex(null);
                              setHoveredSide(null);
                              setShowDragHintIndex(null);
                              if (dragHintTimeoutRef.current) {
                                clearTimeout(dragHintTimeoutRef.current);
                                dragHintTimeoutRef.current = null;
                              }
                            }}
                            onClick={(e) => handleTopicClick(topic, e)}
                            onAddTopicClick={(e) => {
                              e.stopPropagation();
                              setIsAddTopicDrawerOpen(true);
                            }}
                            onDeleteTopic={() => handleDeleteTopic(topic)}
                            onAddSlideBefore={() => handleAddSlideBefore(topic)}
                            onAddSlideAfter={() => handleAddSlideAfter(topic)}
                          />
                        </StaggeredAnimation>
                      );
                    })}
                  </div>
                  <DragOverlay>
                    {activeId
                      ? (() => {
                          const draggedTopic = displayTopics.find(
                            (t) => t.id === activeId
                          );
                          if (!draggedTopic) return null;
                          const { imageSlidesList } =
                            getSlideStatsForCard(draggedTopic);
                          return (
                            <Card className="relative cursor-grabbing transition-all shadow-lg p-0 overflow-hidden gap-0 flex flex-col opacity-90 rotate-3 scale-105">
                              <div className="relative w-full aspect-video overflow-hidden bg-muted">
                                {imageSlidesList.length > 0 ? (
                                  <AnimatedThumbnail
                                    imageSlidesList={imageSlidesList}
                                    topicTitle={draggedTopic.title}
                                    cardIndex={0}
                                    isCertification={false}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <FileText className="h-12 w-12 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="w-full text-xs font-medium px-4 py-2 flex items-center justify-between flex-shrink-0 bg-muted text-primary">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {draggedTopic.stageOrder !== null && (
                                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary font-semibold text-xs flex-shrink-0">
                                      {draggedTopic.stageOrder}
                                    </div>
                                  )}
                                  <span className="truncate font-medium">
                                    {draggedTopic.title}
                                  </span>
                                </div>
                              </div>
                            </Card>
                          );
                        })()
                      : null}
                  </DragOverlay>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Edit Stage Sheet - only in edit mode */}
      {!readonly && (
        <EditStageSheet
          open={isEditSheetOpen}
          onOpenChange={setIsEditSheetOpen}
          stage={stage}
          onStageUpdated={handleStageUpdated}
          onStageDeleted={handleStageDeleted}
        />
      )}

      {/* Add Topic Drawer - only in edit mode */}
      {!readonly && (
        <AddTopicDrawer
          open={isAddTopicDrawerOpen}
          onOpenChange={setIsAddTopicDrawerOpen}
          stageId={stage.id}
          onTopicAdded={handleTopicAdded}
        />
      )}
    </div>
  );
}
