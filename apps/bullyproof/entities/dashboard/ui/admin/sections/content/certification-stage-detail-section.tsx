"use client";

import type { CertificationCourseRow, CourseTopicRow, TopicSlideRow } from "@/types/db";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { compareSlidesByPosition } from "@/lib/fractional-position";
import { certificationApi } from "@/entities/certification/api/endpoints";
import { useCertificationCourses } from "@/entities/certification/model/store";
import {
  useCertificationTopicsByCourseCode,
  useInvalidateCertificationTopics,
} from "@/entities/certification/model/topics-store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Loader2,
  ArrowLeft,
  BookOpen,
  Plus,
  Save,
  GripHorizontal,
  MoreVertical,
  Trash2,
  Edit,
  FileText,
  FilePlus,
  ChevronsLeft,
  ChevronsRight,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Skeleton } from "@workspace/ui/components/skeleton";
import Image from "next/image";
import Marquee from "react-fast-marquee";
import { AddCertificationTopicDrawer } from "./add-certification-topic-drawer";
import { EditCertificationTopicDrawer } from "./edit-certification-topic-drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import {
  AnimatedThumbnail,
  type TopicSlide,
} from "@/components/organisms/animated-thumbnail";
import { CertificationCourseSidebar, type CertificationCourseTab } from "./certification-course-sidebar";
import { CertificationCourseInformation } from "./certification-course-information";
import { CertificationCourseRatings } from "./certification-course-ratings";
import { CertificationCourseResults } from "./certification-course-results";

type Course = CertificationCourseRow & {
  topicCount?: number;
};

type Topic = CourseTopicRow & {
  slides?: Array<
    TopicSlideRow & { signedUrl?: string | null }
  >;
};

type TopicWithSlides = Topic;

// Helper function to get slide stats
function getSlideStatsForCard(topic: TopicWithSlides) {
  // Sort slides by position to ensure correct order
  const slides = (topic.slides || []).sort(compareSlidesByPosition);
  const totalSlides = slides.length;
  const imageSlides = slides.filter((s) => s.kind === "image").length;
  const videoSlides = slides.filter((s) => s.kind === "video").length;

  // Get all image slides sorted by position
  // Include all image slides regardless of URL presence - URLs can be fetched on-demand if missing
  const imageSlidesList: TopicSlide[] = slides
    .filter((s) => s.kind === "image")
    .sort(compareSlidesByPosition)
    .map((s) => ({
      id: s.id,
      position: s.position,
      kind: s.kind,
      imageUrl: s.imageUrl,
      signedUrl: s.signedUrl,
    }));

  return {
    totalSlides,
    imageSlides,
    videoSlides,
    imageSlidesList,
  };
}

interface CertificationCourseDetailSectionProps {
  slug: string;
  readonly?: boolean;
  basePath?: string;
  onBackClick?: () => void;
}

function CertificationTopicCard({
  topic,
  isHovered,
  isLeaving,
  hoveredSide,
  showPlaceholderOverlay,
  isDragHandleHovered,
  showDragHint,
  isDragActive,
  cardIndex = 0,
  readonly = false,
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

  return (
    <div
      className="flex flex-col relative w-full"
      ref={setNodeRef}
      style={style}
    >
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
                isPaused={isDragActive}
                isCertification={true}
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
              {topic.courseOrder !== null && (
                <span className="text-blue-500 font-bold text-xs flex-shrink-0">
                  {topic.courseOrder - 1}
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
    </div>
  );
}

export function CertificationCourseDetailSection({
  slug,
  readonly = false,
  basePath = "/admin/content/certification",
  onBackClick,
}: CertificationCourseDetailSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize activeTab from query params or default to "topics"
  const getInitialTab = (): CertificationCourseTab => {
    const tabParam = searchParams?.get("tab");
    if (tabParam && ["information", "topics", "results", "rating"].includes(tabParam)) {
      return tabParam as CertificationCourseTab;
    }
    return "topics";
  };
  
  const [activeTab, setActiveTab] = useState<CertificationCourseTab>(getInitialTab());
  const [isAddTopicDrawerOpen, setIsAddTopicDrawerOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicWithSlides | null>(
    null
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localTopics, setLocalTopics] = useState<TopicWithSlides[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Use React Query hooks for caching
  const {
    topics: cachedTopics,
    isLoading: isLoadingTopics,
    error: topicsQueryError,
    refetch: refetchTopics,
  } = useCertificationTopicsByCourseCode(slug, {
    includeSlides: true,
    includeUrls: true,
  });

  // Fetch course separately (can also be converted to React Query later)
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoadingCourse, setIsLoadingCourse] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { invalidateTopicsByCourseCode } = useInvalidateCertificationTopics();

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

  // Wrapper function to update both state and URL when tab changes
  const handleTabChange = (newTab: CertificationCourseTab) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("tab", newTab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Sync activeTab with query params on mount and when query params change
  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam && ["information", "topics", "results", "rating"].includes(tabParam)) {
      const newTab = tabParam as CertificationCourseTab;
      if (newTab !== activeTab) {
        setActiveTab(newTab);
      }
    } else if (!tabParam && activeTab !== "topics") {
      // If no tab param, set to default and update URL
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("tab", "topics");
      router.replace(`?${params.toString()}`, { scroll: false });
      setActiveTab("topics");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch course
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setIsLoadingCourse(true);
        setError(null);

        const courseResult = await certificationApi.courses.byCode(slug);
        if (!courseResult.data) {
          setError(
            courseResult.error?.message ?? "Failed to fetch certification course"
          );
          return;
        }
        setCourse(courseResult.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoadingCourse(false);
      }
    };

    fetchCourse();
  }, [slug]);

  // Sync localTopics with cached topics when they change (but not when we're reordering)
  useEffect(() => {
    if (!hasUnsavedChanges && cachedTopics.length > 0) {
      setLocalTopics(cachedTopics);
    }
  }, [cachedTopics, hasUnsavedChanges]);

  // Set error from topics query if any - only after loading completes
  useEffect(() => {
    // Don't set errors while still loading
    if (isLoadingCourse || isLoadingTopics) {
      return;
    }
    
    if (topicsQueryError) {
      setError(
        topicsQueryError instanceof Error
          ? topicsQueryError.message
          : "Failed to fetch topics"
      );
    }
  }, [topicsQueryError, isLoadingCourse, isLoadingTopics]);

  const isLoading = isLoadingCourse || isLoadingTopics;

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

    // Update courseOrder for all topics
    const reorderedTopics = newTopics.map((topic, index) => ({
      ...topic,
      courseOrder: index + 1,
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

  const handleTopicAdded = (newTopic: TopicWithSlides) => {
    const maxOrder =
      localTopics.length > 0
        ? Math.max(...localTopics.map((t) => t.courseOrder || 0))
        : 0;

    const topicWithOrder = {
      ...newTopic,
      courseOrder: maxOrder + 1,
      slides: [],
    };

    setLocalTopics([...localTopics, topicWithOrder]);
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    if (!course?.id || isSaving) return;

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
        const result = await certificationApi.topics.create({
          courseId: course.id,
          title: newTopic.title,
          officialNotes: newTopic.officialNotes || null,
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
          const aOrder = a.courseOrder || 0;
          const bOrder = b.courseOrder || 0;
          return aOrder - bOrder;
        })
        .map((t) => t.id);

      if (topicIds.length > 0) {
        const reorderResult = await certificationApi.topics.reorder({
          courseId: course.id,
          topicIds,
        });

        if (reorderResult.error) {
          throw new Error(
            reorderResult.error.message || "Failed to reorder topics"
          );
        }
      }

      // Invalidate and refetch topics with slides using React Query
      invalidateTopicsByCourseCode(slug);
      await refetchTopics();

      setHasUnsavedChanges(false);
      toast.success("Topics saved successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save topics");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTopicClick = (topic: TopicWithSlides, e?: React.MouseEvent) => {
    if (activeId || topic.id.startsWith("temp_")) return;
    if (topic.slug) {
      router.push(`${basePath}/${slug}/${topic.slug}`);
    } else if (topic.courseOrder !== null && topic.courseOrder !== undefined) {
      // Fallback to courseOrder for backward compatibility
      router.push(`${basePath}/${slug}/T${topic.courseOrder}`);
    }
  };

  const handleAddSlideBefore = (topic: TopicWithSlides) => {
    // Navigate to topic page - the topic editor should handle adding slide at position 0
    if (topic.slug) {
      router.push(`${basePath}/${slug}/${topic.slug}`);
    } else if (topic.courseOrder !== null && topic.courseOrder !== undefined) {
      // Fallback to courseOrder for backward compatibility
      router.push(`${basePath}/${slug}/T${topic.courseOrder}`);
    }
  };

  const handleAddSlideAfter = (topic: TopicWithSlides) => {
    // Navigate to topic page - the topic editor should handle adding slide at the end
    if (topic.slug) {
      router.push(`${basePath}/${slug}/${topic.slug}`);
    } else if (topic.courseOrder !== null && topic.courseOrder !== undefined) {
      // Fallback to courseOrder for backward compatibility
      router.push(`${basePath}/${slug}/T${topic.courseOrder}`);
    }
  };

  const handleAddTopicClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    // For now, just open the add topic drawer
    // In the future, we could add logic to insert at a specific position
    setIsAddTopicDrawerOpen(true);
  };

  // Memoize isDragActive to prevent unnecessary re-renders during rapid drags
  const isDragActive = useMemo(() => activeId !== null, [activeId]);

  const handleDeleteTopic = async (topic: TopicWithSlides) => {
    if (
      !confirm(
        `Are you sure you want to delete "${topic.title}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const result = await certificationApi.topics.delete(topic.id);
      if (result.error) {
        toast.error(result.error.message || "Failed to delete topic");
        return;
      }

      // Remove from local state
      setLocalTopics((prev) => prev.filter((t) => t.id !== topic.id));
      setHasUnsavedChanges(true);
      toast.success("Topic deleted successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete topic"
      );
    }
  };

  const handleTopicUpdated = async () => {
    // Invalidate and refetch topics with slides using React Query
    invalidateTopicsByCourseCode(slug);
    await refetchTopics();
    setEditingTopic(null);
  };

  const handleTopicDeleted = () => {
    handleTopicUpdated();
  };

  const handleDelete = async () => {
    if (!course) return;

    setIsDeleting(true);
    try {
      const result = await certificationApi.courses.delete(course.id);

      if (result.error) {
        toast.error(result.error.message || "Failed to delete course");
        setShowDeleteDialog(false);
        return;
      }

      toast.success("Course deleted successfully");
      setShowDeleteDialog(false);
      
      // Navigate back after deletion
      if (onBackClick) {
        onBackClick();
      } else {
        router.push(basePath);
      }
    } catch (err) {
      console.error("Failed to delete certification course:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Failed to delete certification course. Please try again.";
      toast.error(errorMessage);
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Get display topics (localTopics if we have unsaved changes, otherwise cachedTopics)
  const displayTopics = hasUnsavedChanges ? localTopics : cachedTopics;

  // Show skeleton loaders only if we have no cached data
  const showSkeletons = isLoading && !course;

  // Only show errors after loading completes
  if (error && !isLoading) {
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
              <p className="font-medium">Error loading certification course</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showSkeletons) {
    return (
      <div className="space-y-6">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-2">
          <Skeleton className="h-9 w-48" />
        </div>
        <ScrollArea className="flex-1 pr-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="aspect-video" />
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Only check for missing course after loading completes
  if (!course && !isLoading) {
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
          Back to Courses
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p className="font-medium">Course not found</p>
              <p className="text-sm mt-2">
                The certification course you're looking for doesn't exist.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Course Header - Sticky */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-6 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (onBackClick) {
                  onBackClick();
                } else {
                  router.push(basePath);
                }
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary flex-shrink-0" />
              <h1 className="text-3xl font-bold tracking-tight">
                {course.name}
              </h1>
            </div>
          </div>
          {!readonly && activeTab === "topics" && hasUnsavedChanges && (
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
          {!readonly && activeTab === "topics" && !hasUnsavedChanges && (
            <Button onClick={() => setIsAddTopicDrawerOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Topic
            </Button>
          )}
        </div>
      </div>

      {/* Sidebar + Content Layout */}
      <div className="flex gap-6 h-full">
        {/* Sidebar Navigation */}
        <CertificationCourseSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          course={course}
          onDeleteClick={() => setShowDeleteDialog(true)}
          isDeleting={isDeleting}
        />

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {activeTab === "topics" && (
            <div className="flex flex-col h-full">
              {/* Scrollable Topics Grid */}
              <ScrollArea className="flex-1 pr-4">
                <div className="pr-4">
            {isLoadingTopics && displayTopics.length === 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : displayTopics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No topics found for this course.</p>
                {!readonly && (
                  <Button
                    className="mt-4"
                    onClick={() => setIsAddTopicDrawerOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Topic
                  </Button>
                )}
              </div>
            ) : readonly ? (
              <div className="grid grid-cols-3 gap-4">
                {displayTopics.map((topic, index) => (
                  <StaggeredAnimation
                    key={topic.id}
                    index={index}
                    incrementDelay={0.075}
                  >
                    <CertificationTopicCard
                      topic={topic}
                      isHovered={false}
                      isLeaving={false}
                      hoveredSide={null}
                      showPlaceholderOverlay={false}
                      isDragHandleHovered={false}
                      showDragHint={false}
                      isDragActive={false}
                      cardIndex={index}
                      readonly={true}
                      onMouseEnter={() => {}}
                      onMouseLeave={() => {}}
                      onChevronHover={() => {}}
                      onChevronLeave={() => {}}
                      onDragHandleEnter={() => {}}
                      onDragHandleLeave={() => {}}
                      onClick={(e) => handleTopicClick(topic, e)}
                      onAddTopicClick={() => {}}
                      onDeleteTopic={() => {}}
                      onAddSlideBefore={() => {}}
                      onAddSlideAfter={() => {}}
                    />
                  </StaggeredAnimation>
                ))}
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
                  <div className="grid grid-cols-3 gap-4">
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
                          <CertificationTopicCard
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
                              setLeavingIndex(null);
                              setShowDragHintIndex(null);
                              if (dragHintTimeoutRef.current) {
                                clearTimeout(dragHintTimeoutRef.current);
                                dragHintTimeoutRef.current = null;
                              }
                            }}
                            onClick={(e) => handleTopicClick(topic, e)}
                            onAddTopicClick={(e) =>
                              handleAddTopicClick(e, index)
                            }
                            onDeleteTopic={() => handleDeleteTopic(topic)}
                            onAddSlideBefore={() => handleAddSlideBefore(topic)}
                            onAddSlideAfter={() => handleAddSlideAfter(topic)}
                          />
                        </StaggeredAnimation>
                      );
                    })}
                  </div>
                </SortableContext>
                <DragOverlay>
                  {activeId
                    ? (() => {
                        const draggedTopic = displayTopics.find(
                          (t) => t.id === activeId
                        );
                        if (!draggedTopic) return null;
                        return (
                          <Card className="relative cursor-grabbing transition-all shadow-lg p-0 overflow-hidden gap-0 flex flex-col opacity-90 rotate-3 scale-105">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">
                                {draggedTopic.title}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="text-xs text-muted-foreground">
                                {draggedTopic.slides?.length || 0} slides
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })()
                    : null}
                </DragOverlay>
              </DndContext>
            )}
                </div>
              </ScrollArea>
            </div>
          )}

          {activeTab === "information" && course && (
            <CertificationCourseInformation
              course={course}
              onCourseUpdated={() => {
                certificationApi.courses.byCode(slug).then((result) => {
                  if (result.data) {
                    setCourse(result.data);
                  }
                });
              }}
            />
          )}

          {activeTab === "rating" && course && (
            <CertificationCourseRatings
              courseId={course.id}
              course={course}
              onCourseUpdated={() => {
                certificationApi.courses.byCode(slug).then((result) => {
                  if (result.data) {
                    setCourse(result.data);
                  }
                });
              }}
            />
          )}

          {activeTab === "results" && course && (
            <CertificationCourseResults courseId={course.id} />
          )}
        </div>
      </div>

      {/* Add Topic Drawer */}
      {course && (
        <AddCertificationTopicDrawer
          open={isAddTopicDrawerOpen}
          onOpenChange={setIsAddTopicDrawerOpen}
          courseId={course.id}
          onTopicAdded={handleTopicAdded}
        />
      )}

      {/* Edit Topic Drawer */}
      {editingTopic && (
        <EditCertificationTopicDrawer
          open={!!editingTopic}
          onOpenChange={(open) => {
            if (!open) {
              setEditingTopic(null);
            }
          }}
          topic={editingTopic}
          onTopicUpdated={handleTopicUpdated}
          onTopicDeleted={handleTopicDeleted}
        />
      )}

      {/* Delete Course Dialog */}
      {course && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the certification course "{course.name}". This action
                cannot be undone. All topics associated with this course will also
                be affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
