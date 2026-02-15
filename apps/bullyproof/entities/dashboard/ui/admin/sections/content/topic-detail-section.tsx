"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import CountUp from "react-countup";
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
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";
import { topicsApi } from "@/entities/topics/api/endpoints";
import { certificationApi } from "@/entities/certification/api/endpoints";
import type { topics, topicSlides, courseTopics } from "@/server/db/schema";
import type { QuizData } from "@/components/organisms/quiz-slide-editor";
import { renderQuestionWithUrls } from "@/utils/parse-question-urls";
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
  FileText,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Video as VideoIcon,
  Upload,
  Info,
  StickyNote,
  Plus,
  Trash2,
  Check,
  Save,
  GripHorizontal,
  Pencil,
  Download,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Progress } from "@workspace/ui/components/progress";
import {
  SlideRenderer,
  type SlideData,
} from "@/components/organisms/slide-renderer";
import { Separator } from "@workspace/ui/components/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@workspace/ui/components/tooltip";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@workspace/ui/components/hover-card";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { uploadSlideImage } from "@/utils/supabase/upload";
import {
  useTopicsByStage,
  useInvalidateTopics,
} from "@/entities/topics/model/store-enhanced";
import { useStageBySlug, useInvalidateStage } from "@/entities/stages/model/store";
import { useMutationInvalidation } from "@/hooks/use-mutation-invalidation";
import { ImageSelectorDialog } from "@/components/organisms/image-selector-dialog";
import { ConfirmChangesDialog } from "@/components/organisms/confirm-changes-dialog";
import { EditCertificationTopicDrawer } from "./edit-certification-topic-drawer";
import { EditCurriculumTopicDrawer } from "./edit-curriculum-topic-drawer";
import { createSlug } from "@/utils/slug";

type Topic = typeof topics.$inferSelect & {
  stage?: any;
  slides?: Array<typeof topicSlides.$inferSelect>;
};

type CertificationTopic = typeof courseTopics.$inferSelect & {
  slides?: Array<typeof topicSlides.$inferSelect>;
};

type TopicContext = "curriculum" | "certification";

// Helper function to check if a slide has content
function slideHasContent(
  slide: SlideData | { id: string; kind: string; imageUrl?: string | null; videoUrl?: string | null; textHtml?: string | null; quizData?: any; signedUrl?: string | null },
  isCertification: boolean,
  pendingFileUploads?: Map<string, File>
): boolean {
  // Check if imageUrl exists and is not just a placeholder/invalid URL
  // Blob URLs are temporary and valid (from file uploads)
  const imageUrl = slide.imageUrl;
  const signedUrl = (slide as any).signedUrl; // Signed URL from API - null if file doesn't exist

  // For image slides: require valid image content (blob, signedUrl, or pending upload).
  // Empty image slides (no URL, broken URL, or missing file) are ghost slides - treat as having no content
  // so they can be filtered on load and marked for deletion.
  const isBlobUrl = imageUrl?.startsWith("blob:");
  const hasValidImageUrl = isBlobUrl || (!!signedUrl && signedUrl.trim() !== "");
  const hasPendingUpload = pendingFileUploads?.has(slide.id) || false;
  if (slide.kind === "image") {
    return hasValidImageUrl || hasPendingUpload;
  }
  
  const hasVideoUrl = !!slide.videoUrl && slide.videoUrl.trim() !== "";
  const hasQuizData =
    isCertification &&
    slide.kind === "quiz" &&
    (slide as any).quizData &&
    (slide as any).quizData.question &&
    (slide as any).quizData.answers?.length >= 2;
  const hasTextHtml =
    !isCertification && slide.kind === "text" && !!slide.textHtml?.trim();

  const hasContent = hasValidImageUrl || hasVideoUrl || hasQuizData || hasTextHtml || hasPendingUpload;

  // Log detailed info for debugging empty slides
  if (!hasContent) {
    console.warn("[slideHasContent] Empty slide detected:", {
      id: slide.id,
      kind: slide.kind,
      imageUrl: imageUrl?.substring(0, 100),
      signedUrl: signedUrl?.substring(0, 100) || "null",
      isBlobUrl,
      hasValidImageUrl,
      hasVideoUrl,
      hasQuizData,
      hasTextHtml,
      hasPendingUpload,
      orderIndex: (slide as any).orderIndex,
    });
  }

  return hasContent;
}

// Sortable slide item component
function SortableSlideItem({
  slide,
  index,
  isActive,
  currentSlideIndex,
  slideRefreshKey,
  isReordering,
  hoveredSlideIndex,
  showAddButton,
  isCertification,
  onSlideClick,
  onMouseEnter,
  onMouseLeave,
  onCreateSlide,
  hoverTimeoutRef,
  hideButtonTimeoutRef,
}: {
  slide: SlideData;
  index: number;
  isActive: boolean;
  currentSlideIndex: number;
  slideRefreshKey: number;
  isReordering: boolean;
  hoveredSlideIndex: number | null;
  showAddButton: number | null;
  isCertification: boolean;
  onSlideClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onCreateSlide: () => void;
  hoverTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  hideButtonTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: slide.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Show add button if this slide index matches showAddButton
  const showAddButtonForSlide =
    showAddButton === index &&
    !isDragging &&
    !isReordering;

  return (
    <div className="flex items-center relative" ref={setNodeRef} style={style}>
      {/* Slide button */}
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => {
          e.stopPropagation();
          if (!isReordering) {
            onSlideClick();
          }
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`
          flex-shrink-0 relative group transition-all rounded-lg overflow-hidden shadow-lg bg-background
          ${
            isReordering
              ? "cursor-wait opacity-50"
              : "cursor-grab active:cursor-grabbing"
          }
          ${
            index === currentSlideIndex
              ? "ring-2 ring-primary ring-offset-2 scale-105"
              : "opacity-70 hover:opacity-100 hover:scale-[1.02]"
          }
          ${isDragging ? "opacity-30 scale-90" : ""}
        `}
        style={{
          width: "180px",
          aspectRatio: "16 / 9",
        }}
      >
        {/* Drag handle indicator */}
        {!isDragging && (
          <div className="absolute top-2 right-2 z-10 bg-background/80 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripHorizontal className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="w-full h-full relative">
          <SlideRenderer
            key={`${slide.id}-${slideRefreshKey}`}
            slide={slide}
            className="w-full h-full"
            thumbnailOnly={true}
            isCertification={isCertification}
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 text-center text-xs font-medium py-1 px-2 bg-background/80 text-foreground">
          Slide {slide.orderIndex + 1}
        </div>
      </button>

      {/* Add slide button */}
      <div
        className="flex-shrink-0 flex items-center justify-center transition-all duration-200"
        style={{
          width: showAddButtonForSlide ? "48px" : "0px",
          opacity: showAddButtonForSlide ? 1 : 0,
        }}
        onMouseEnter={() => {
          if (hideButtonTimeoutRef.current) {
            clearTimeout(hideButtonTimeoutRef.current);
            hideButtonTimeoutRef.current = null;
          }
        }}
        onMouseLeave={() => {
          if (hideButtonTimeoutRef.current) {
            clearTimeout(hideButtonTimeoutRef.current);
          }
          hideButtonTimeoutRef.current = setTimeout(() => {
            // This will be handled by parent
          }, 200);
        }}
      >
        {showAddButtonForSlide && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateSlide();
                }}
                className="h-10 w-12 rounded-lg bg-background/50 border-2 border-dashed border-muted-foreground/40 shadow-sm flex items-center justify-center hover:bg-background/80 hover:border-muted-foreground/60 transition-all cursor-pointer ml-4"
              >
                <Plus className="h-5 w-5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add slide</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

interface TopicDetailSectionProps {
  context?: TopicContext; // Default to curriculum for backward compatibility
  // For curriculum
  stageSlug?: string;
  topicSlug?: string;
  // For certification
  topicId?: string;
  stageCode?: string; // For certification, needed for file paths
  excludeQuizSlides?: boolean; // Filter out quiz slides (for slides-only page)
}

export function TopicDetailSection({
  context = "curriculum",
  stageSlug,
  topicSlug,
  topicId,
  stageCode,
  excludeQuizSlides = false,
}: TopicDetailSectionProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Detect if we're on a certification page by checking the URL path
  // Check if path contains "/admin/content/certification"
  const isCertificationFromUrl = pathname.includes(
    "/admin/content/certification"
  );
  const isCertification = context === "certification" || isCertificationFromUrl;
  const [stage, setStage] = useState<any | null>(null);
  const [topic, setTopic] = useState<Topic | CertificationTopic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const slideGalleryRef = useRef<HTMLDivElement>(null);
  const wheelHandlerRef = useRef<((e: WheelEvent) => void) | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrlValue, setImageUrlValue] = useState<string>("");
  const [videoUrlValue, setVideoUrlValue] = useState<string>("");
  const urlUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const [slideRefreshKey, setSlideRefreshKey] = useState(0);
  // @dnd-kit drag state
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [hoveredSlideIndex, setHoveredSlideIndex] = useState<number | null>(
    null
  );
  const [showAddButton, setShowAddButton] = useState<number | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isCreatingSlide, setIsCreatingSlide] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeletingSlide, setIsDeletingSlide] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleteSelectedIds, setBulkDeleteSelectedIds] = useState<
    Set<string>
  >(new Set());

  // Local state for slides (working copy)
  // ExtendedSlideData is the same as SlideData (which now includes quizData)
  type ExtendedSlideData = SlideData;
  const [localSlides, setLocalSlides] = useState<ExtendedSlideData[]>([]);
  const [pendingFileUploads, setPendingFileUploads] = useState<
    Map<string, File>
  >(new Map());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [deletedSlideIds, setDeletedSlideIds] = useState<Set<string>>(
    new Set()
  );
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] =
    useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null
  );
  const [originalSlides, setOriginalSlides] = useState<ExtendedSlideData[]>([]);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [showChangesDialog, setShowChangesDialog] = useState(false);
  const [showSaveProgressDialog, setShowSaveProgressDialog] = useState(false);
  const [changesToShow, setChangesToShow] = useState<ChangeItem[]>([]);

  // Debug: Log when showChangesDialog changes
  useEffect(() => {
    console.log(
      "showChangesDialog changed to:",
      showChangesDialog,
      "changesToShow:",
      changesToShow.length
    );
  }, [showChangesDialog, changesToShow]);
  const [pendingSave, setPendingSave] = useState(false);
  const [showImageSelectorDialog, setShowImageSelectorDialog] = useState(false);
  const [insertAfterIndexForDialog, setInsertAfterIndexForDialog] = useState<
    number | null
  >(null);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [isEditTopicDrawerOpen, setIsEditTopicDrawerOpen] = useState(false);
  const [isEditCurriculumTopicDrawerOpen, setIsEditCurriculumTopicDrawerOpen] = useState(false);
  const [showLessonPlanDialog, setShowLessonPlanDialog] = useState(false);
  const [lessonPlans, setLessonPlans] = useState<
    Array<{
      id: string;
      topicId: string;
      fileName: string;
      fileUrl: string;
      fileSize: number | null;
      uploadedBy: string | null;
      createdAt: string;
    }>
  >([]);
  const [isLoadingLessonPlans, setIsLoadingLessonPlans] = useState(false);
  const [isUploadingLessonPlan, setIsUploadingLessonPlan] = useState(false);
  const [isDeletingLessonPlan, setIsDeletingLessonPlan] = useState<string | null>(null);
  const lessonPlanFileInputRef = useRef<HTMLInputElement>(null);

  // @dnd-kit sensors
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (hideButtonTimeoutRef.current) {
        clearTimeout(hideButtonTimeoutRef.current);
      }
    };
  }, []);

  // Handle browser tab close with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ""; // Chrome requires returnValue to be set
        return ""; // For older browsers
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Intercept Link clicks for in-app navigation
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Find the closest anchor tag or Link component
      const link = target.closest("a[href]");

      if (link && link.getAttribute("href")) {
        const href = link.getAttribute("href");
        // Only intercept internal navigation (not external links or anchors)
        if (href && href.startsWith("/") && !href.startsWith("//")) {
          e.preventDefault();
          e.stopPropagation();
          setPendingNavigation(href);
          setShowUnsavedChangesDialog(true);
        }
      }
    };

    document.addEventListener("click", handleClick, true); // Use capture phase
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [hasUnsavedChanges]);

  // Handle wheel event for horizontal scrolling in slide gallery
  // Use callback ref to set up event listener when element is mounted
  const setGalleryRef = useCallback((element: HTMLDivElement | null) => {
    // Clean up previous listener if ref changes
    if (slideGalleryRef.current && wheelHandlerRef.current) {
      slideGalleryRef.current.removeEventListener(
        "wheel",
        wheelHandlerRef.current
      );
    }

    slideGalleryRef.current = element;

    if (!element) {
      wheelHandlerRef.current = null;
      return;
    }

    // Create handler function
    const handleWheel = (e: WheelEvent) => {
      // The event is attached to the gallery element, so it will only fire for events on it or its children
      // Convert vertical scroll to horizontal scroll
      e.preventDefault();
      e.stopPropagation();
      element.scrollLeft += e.deltaY;
    };

    wheelHandlerRef.current = handleWheel;
    element.addEventListener("wheel", handleWheel, { passive: false });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (slideGalleryRef.current && wheelHandlerRef.current) {
        slideGalleryRef.current.removeEventListener(
          "wheel",
          wheelHandlerRef.current
        );
      }
    };
  }, []);

  // Wrapper for safe navigation that checks for unsaved changes
  const safeNavigate = useCallback(
    (url: string) => {
      if (hasUnsavedChanges) {
        setPendingNavigation(url);
        setShowUnsavedChangesDialog(true);
      } else {
        router.push(url);
      }
    },
    [hasUnsavedChanges, router]
  );

  // Handle navigation confirmation
  const handleConfirmNavigation = () => {
    setHasUnsavedChanges(false);
    setShowUnsavedChangesDialog(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleCancelNavigation = () => {
    setShowUnsavedChangesDialog(false);
    setPendingNavigation(null);
  };

  // No-op: signed URLs are managed by the API/DB cache
  const setSlideUrl = (_slideId: string, _url: string) => {};
  // No-op invalidation stubs – TQ invalidation handles freshness
  const invalidateSlide = (_slideId: string) => {};
  const invalidateCertificationSlide = (_slideId: string) => {};

  // Resolve topic by slug: primary = createSlug(title), fallback = T1/T2 legacy format
  const isLegacyTopicSlug = topicSlug ? /^T\d+$/.test(topicSlug) : false;
  const legacyTopicOrder = isLegacyTopicSlug && topicSlug
    ? parseInt(topicSlug.substring(1), 10)
    : null;

  // Use React Query hooks for caching (curriculum flow only)
  const {
    stage: cachedStage,
    isLoading: isLoadingStage,
    error: stageError,
    refetch: refetchStage,
  } = useStageBySlug(isCertification ? null : stageSlug || null);

  const {
    topics: cachedTopics,
    isLoading: isLoadingTopics,
    error: topicsError,
    refetch: refetchTopics,
  } = useTopicsByStage(
    isCertification ? null : cachedStage?.id || null,
    isCertification
      ? undefined
      : {
          includeSlides: true,
          includeUrls: true,
        }
  );

  // Invalidation hooks for curriculum topics
  const { invalidateTopicsByStage, invalidateTopic } = useInvalidateTopics();
  const { invalidateStage } = useInvalidateStage();
  const { invalidateAfterMutation } = useMutationInvalidation();

  // Extract fetchData function so it can be reused after save (for certification and manual refetch)
  const fetchTopicData = useCallback(
    async (skipLoading = false) => {
      try {
        if (!skipLoading) {
          setIsLoading(true);
        }
        setError(null);

        if (isCertification) {
          // Certification flow: fetch topic directly by ID
          if (!topicId) return;

          const topicResult = await certificationApi.topics.byId(topicId);
          if (!topicResult.data) {
            setError(
              topicResult.error?.message ??
                "Failed to fetch certification topic"
            );
            return;
          }

          setTopic(topicResult.data);

          // Fetch slides separately (this includes signedUrl from batch fetch)
          const slidesResult =
            await certificationApi.topics.slides.list(topicId);
          if (slidesResult.data) {
            const allSlides: ExtendedSlideData[] = slidesResult.data
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((slide) => {
                const slideWithUrl = slide as typeof slide & { signedImageUrl?: string | null };
                return {
                  id: slide.id,
                  kind: slide.kind as SlideData["kind"],
                  orderIndex: slide.orderIndex,
                  textHtml: slide.textHtml ?? null,
                  imageUrl: slide.imageUrl ?? null,
                  videoUrl: slide.videoUrl ?? null,
                  videoStartS: slide.videoStartS ?? null,
                  videoEndS: slide.videoEndS ?? null,
                  quizData: (slide as any).quizData as QuizData | null,
                  effectiveNotes: (slide as any).officialNotes ?? null,
                };
              });
            
            // Filter out empty slides (slides without any content)
            // Note: Image slides are always shown, even if empty, so users can add images to them
            console.log("[topic-detail] [CERTIFICATION] Loading slides - total slides from DB:", allSlides.length);
            const validSlides = allSlides.filter((slide) => {
              const hasContent = slideHasContent(slide, isCertification);
              if (!hasContent) {
                console.warn("[topic-detail] [CERTIFICATION] Found empty slide:", {
                  id: slide.id,
                  kind: slide.kind,
                  imageUrl: slide.imageUrl,
                  videoUrl: slide.videoUrl,
                  textHtml: slide.textHtml?.substring(0, 50),
                  quizData: (slide as any).quizData ? "exists" : "null",
                });
              }
              return hasContent;
            });
            
            console.log("[topic-detail] [CERTIFICATION] After filtering empty slides:", {
              total: allSlides.length,
              valid: validSlides.length,
              empty: allSlides.length - validSlides.length,
            });
            
            // Filter out quiz slides if excludeQuizSlides is true
            let filteredSlides = validSlides;
            if (excludeQuizSlides) {
              filteredSlides = validSlides.filter((slide) => slide.kind !== "quiz");
              console.log("[topic-detail] [CERTIFICATION] Filtered out quiz slides:", {
                before: validSlides.length,
                after: filteredSlides.length,
                quizCount: validSlides.length - filteredSlides.length,
              });
            }
            
            // Reorder slides to have sequential orderIndex after filtering
            const initialSlides = filteredSlides.map((slide, index) => ({
              ...slide,
              orderIndex: index,
            }));
            
            // If we filtered out any slides (non-image slides), mark them for deletion
            // Mark empty slides (including ghost image slides) for deletion
            const emptySlideIds = allSlides
              .filter((slide) => !slideHasContent(slide, isCertification))
              .map((slide) => slide.id);
            
            if (emptySlideIds.length > 0) {
              console.log("[topic-detail] [CERTIFICATION] Marking empty slides for deletion:", emptySlideIds);
            }
            
            console.log("[topic-detail] [CERTIFICATION] Setting local slides:", initialSlides.length, "slides");
            setLocalSlides(initialSlides);
            setOriginalSlides(JSON.parse(JSON.stringify(initialSlides)));
            setHasUnsavedChanges(emptySlideIds.length > 0);
            setDeletedSlideIds(new Set(emptySlideIds));
            setPendingFileUploads(new Map());
          }
        } else {
          // Curriculum flow: use cached data from hooks
          // This will be handled by useEffect below
          return;
        }
      } catch (err) {
        console.error("Failed to fetch topic:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch topic details"
        );
      } finally {
        if (!skipLoading) {
          setIsLoading(false);
        }
      }
    },
    [isCertification, topicId, invalidateCertificationSlide]
  );

  // Handle certification flow
  useEffect(() => {
    if (isCertification) {
      fetchTopicData();
    }
  }, [isCertification, fetchTopicData]);

  // Find the current topic from cached data (memoized to prevent unnecessary recalculations)
  // Use topic IDs as a stable reference to detect actual changes
  const topicsKey = useMemo(() => {
    if (!cachedTopics || cachedTopics.length === 0) return null;
    return cachedTopics
      .map((t) => t.id)
      .sort()
      .join(",");
  }, [cachedTopics]);

  const foundTopic = useMemo(() => {
    if (isCertification || !cachedTopics || !topicSlug) return null;
    return (
      isLegacyTopicSlug
        ? cachedTopics.find((t) => t.stageOrder === legacyTopicOrder)
        : cachedTopics.find((t) => createSlug(t.title) === topicSlug)
    ) as any;
  }, [isCertification, cachedTopics, topicSlug, isLegacyTopicSlug, legacyTopicOrder]);

  // Track the last processed topic ID to prevent infinite loops
  const lastProcessedTopicIdRef = useRef<string | null>(null);
  const lastTopicSlugRef = useRef<string | null>(null);

  // Reset ref when topic slug changes (navigating to different topic)
  useEffect(() => {
    if (topicSlug !== lastTopicSlugRef.current) {
      lastProcessedTopicIdRef.current = null;
      lastTopicSlugRef.current = topicSlug ?? null;
    }
  }, [topicSlug]);

  // Handle curriculum flow with cached data
  useEffect(() => {
    if (isCertification) return;
    if (!stageSlug || !topicSlug) return;

    // Set loading state based on hooks
    setIsLoading(isLoadingStage || isLoadingTopics);

    // Wait for queries to complete before checking for errors or missing data
    if (isLoadingStage || isLoadingTopics) {
      // Still loading - wait for queries to complete
      return;
    }

    // Only check for errors after loading completes
    if (stageError) {
      setError(stageError.message || "Failed to fetch curriculum stage");
      setIsLoading(false);
      return;
    }
    if (topicsError) {
      setError(topicsError.message || "Failed to fetch topics");
      setIsLoading(false);
      return;
    }

    // Only check for missing data after loading completes
    if (!cachedStage || !foundTopic) {
      if (!foundTopic && cachedTopics && cachedTopics.length > 0) {
        // Topics loaded but this specific topic not found
        setError(`Topic not found`);
        setIsLoading(false);
        lastProcessedTopicIdRef.current = null;
      } else if (!cachedStage) {
        // Stage not found after loading completed
        setError(`Stage not found`);
        setIsLoading(false);
      } else if (!foundTopic && !cachedTopics) {
        // Topics not loaded after loading completed
        setError(`Failed to load topics for stage`);
        setIsLoading(false);
      }
      return;
    }

    // Prevent re-processing the same topic (avoid infinite loop)
    // Only reset state if this is a NEW topic (different from what we've processed)
    const isNewTopic = lastProcessedTopicIdRef.current !== foundTopic.id;

    if (!isNewTopic) {
      // Same topic - sync title/status from TQ cache if it changed, but don't reset slides
      if (foundTopic && topic) {
        if (foundTopic.title !== topic.title || foundTopic.status !== topic.status) {
          setTopic({
            ...topic,
            title: foundTopic.title,
            status: foundTopic.status,
          });
        }
      }
      setIsLoading(false);
      return;
    }

    // Mark this topic as processed BEFORE any state updates
    lastProcessedTopicIdRef.current = foundTopic.id;

    // Set stage from cached data
    setStage(cachedStage);

    // Topic already has slides and URLs from the cached data
    setTopic(foundTopic as Topic);
    const allSlides =
      foundTopic.slides
        ?.sort((a: any, b: any) => a.orderIndex - b.orderIndex)
        .map((slide: any) => ({
          id: slide.id,
          kind: slide.kind as "text" | "image" | "video",
          orderIndex: slide.orderIndex,
          textHtml: slide.textHtml ?? null,
          imageUrl: slide.imageUrl ?? null,
          videoUrl: slide.videoUrl ?? null,
          videoStartS: slide.videoStartS ?? null,
          videoEndS: slide.videoEndS ?? null,
          effectiveNotes: slide.officialNotes ?? null,
          signedUrl: slide.signedUrl ?? null,
        })) ?? [];
    
    // Filter out empty slides (including ghost image slides with no valid URL/signedUrl)
    console.log("[topic-detail] Loading slides - total slides from DB:", allSlides.length);
    const validSlides = allSlides.filter((slide) => {
      const hasContent = slideHasContent(slide, isCertification);
      if (!hasContent) {
        console.warn("[topic-detail] Found empty slide:", {
          id: slide.id,
          kind: slide.kind,
          imageUrl: slide.imageUrl?.substring(0, 100),
          videoUrl: slide.videoUrl,
          textHtml: slide.textHtml?.substring(0, 50),
          orderIndex: slide.orderIndex,
        });
      } else {
        // Log details for the last slide to debug why it might appear empty
        if (slide.orderIndex === allSlides.length - 1) {
          console.log("[topic-detail] Last slide content check:", {
            id: slide.id,
            kind: slide.kind,
            imageUrl: slide.imageUrl?.substring(0, 100),
            hasImageUrl: !!slide.imageUrl,
            videoUrl: slide.videoUrl,
            textHtml: slide.textHtml?.substring(0, 50),
            orderIndex: slide.orderIndex,
            hasContent,
          });
        }
      }
      return hasContent;
    });
    
    console.log("[topic-detail] After filtering empty slides:", {
      total: allSlides.length,
      valid: validSlides.length,
      empty: allSlides.length - validSlides.length,
    });
    
    // Reorder slides to have sequential orderIndex after filtering
    const initialSlides = validSlides.map((slide, index) => ({
      ...slide,
      orderIndex: index,
    }));
    
    // If we filtered out any slides (including empty image slides / ghost slides), mark them for deletion
    if (allSlides.length !== validSlides.length) {
      const emptySlideIds = allSlides
        .filter((slide) => !slideHasContent(slide, isCertification))
        .map((slide) => slide.id);
      console.log("[topic-detail] Marking empty slides for deletion:", emptySlideIds);
      setDeletedSlideIds(new Set(emptySlideIds));
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
      setDeletedSlideIds(new Set());
    }

    console.log("[topic-detail] Setting local slides:", initialSlides.length, "slides");
    setLocalSlides(initialSlides);
    setOriginalSlides(JSON.parse(JSON.stringify(initialSlides)));
    setPendingFileUploads(new Map());

    // Cache signed URLs if they exist (don't invalidate - we just cached them!)
    // Batch these updates - Zustand will batch them automatically
    initialSlides.forEach((slide) => {
      if (slide.kind === "image" && (slide as any).signedUrl) {
        setSlideUrl(slide.id, (slide as any).signedUrl);
      }
    });

    setIsLoading(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isCertification,
    stageSlug,
    topicSlug,
    cachedStage?.id, // Use ID instead of whole object
    foundTopic?.id, // Use found topic ID - this is stable and changes only when topic changes
    isLoadingStage,
    isLoadingTopics,
    stageError,
    topicsError,
    // Note: setSlideUrl is stable from Zustand, cachedTopics is tracked via foundTopic
  ]);

  // Sync local topic state with TQ cache when topic is updated (for same topic ID)
  useEffect(() => {
    if (isCertification || !foundTopic || !topic) return;
    
    if (foundTopic.id === topic.id) {
      if (foundTopic.title !== topic.title || foundTopic.status !== topic.status) {
        setTopic({
          ...topic,
          title: foundTopic.title,
          status: foundTopic.status,
        });
      }
    }
  }, [foundTopic, isCertification, topic]);

  // Use local slides instead of topic.slides
  const slides = localSlides.filter((s) => !deletedSlideIds.has(s.id));
  const currentSlide = slides[currentSlideIndex];
  const canGoPrev = currentSlideIndex > 0;
  const canGoNext = currentSlideIndex < slides.length - 1;
  const isImageOrVideo =
    currentSlide?.kind === "image" || currentSlide?.kind === "video";
  const isImageVideoOrQuiz =
    currentSlide?.kind === "image" ||
    currentSlide?.kind === "video" ||
    (isCertification && currentSlide?.kind === "quiz");

  // Sync URL values with current slide and clear errors
  useEffect(() => {
    if (currentSlide?.kind === "image") {
      setImageUrlValue(currentSlide.imageUrl || "");
    } else if (currentSlide?.kind === "video") {
      setVideoUrlValue(currentSlide.videoUrl || "");
    }
    setUploadError(null);
  }, [
    currentSlide?.id,
    currentSlide?.imageUrl,
    currentSlide?.videoUrl,
    currentSlide?.kind,
  ]);

  const handleTypeChange = (newType: string) => {
    if (newType !== currentSlide?.kind) {
      if (newType === "image" || newType === "video") {
        // Change type immediately in local state - no dialog needed
        if (!currentSlide) return;
        const updatedSlides = localSlides.map((slide) => {
          if (slide.id !== currentSlide.id) return slide;

          if (newType === "image") {
            // Changing to image: set videoUrl to null, keep or set imageUrl
            return {
              ...slide,
              kind: "image" as const,
              imageUrl: slide.imageUrl || null,
              videoUrl: null,
              textHtml: null,
              quizData: null,
            };
          } else {
            // Changing to video: set imageUrl to null, keep existing videoUrl or null
            return {
              ...slide,
              kind: "video" as const,
              videoUrl: slide.videoUrl || null,
              imageUrl: null,
              textHtml: null,
              quizData: null,
            };
          }
        });
        setLocalSlides(updatedSlides);

        // Update URL value state to match the new type
        if (newType === "video") {
          setVideoUrlValue(currentSlide.videoUrl || "");
        } else if (newType === "image") {
          setImageUrlValue(currentSlide.imageUrl || "");
        }

        setUploadError(null);
        setHasUnsavedChanges(true);
      } else if (newType === "text" && !isCertification) {
        // Text type for curriculum - handle directly
        if (!currentSlide) return;
        const updatedSlides = localSlides.map((slide) => {
          if (slide.id !== currentSlide.id) return slide;
          return {
            ...slide,
            kind: "text" as const,
            textHtml: slide.textHtml || "",
            imageUrl: null,
            videoUrl: null,
            quizData: null,
          };
        });
        setLocalSlides(updatedSlides);
        setHasUnsavedChanges(true);
      }
    }
  };

  const handleVideoUrlChange = (newUrl: string) => {
    if (!currentSlide) return;

    setVideoUrlValue(newUrl);

    // Update local slide state
    const updatedSlides = localSlides.map((slide) =>
      slide.id === currentSlide.id
        ? { ...slide, videoUrl: newUrl || null }
        : slide
    );
    setLocalSlides(updatedSlides);
    setHasUnsavedChanges(true);
  };

  const handleVideoStartTimeChange = (value: string) => {
    if (!currentSlide) return;

    const numValue = value === "" ? null : Number(value);
    if (numValue !== null && (isNaN(numValue) || numValue < 0)) return;

    // Update local slide state
    const updatedSlides = localSlides.map((slide) =>
      slide.id === currentSlide.id ? { ...slide, videoStartS: numValue } : slide
    );
    setLocalSlides(updatedSlides);
    setHasUnsavedChanges(true);
  };

  const handleVideoEndTimeChange = (value: string) => {
    if (!currentSlide) return;

    const numValue = value === "" ? null : Number(value);
    if (numValue !== null && (isNaN(numValue) || numValue < 0)) return;

    // Update local slide state
    const updatedSlides = localSlides.map((slide) =>
      slide.id === currentSlide.id ? { ...slide, videoEndS: numValue } : slide
    );
    setLocalSlides(updatedSlides);
    setHasUnsavedChanges(true);
  };

  const handleFileUpload = (file: File) => {
    if (!file || !currentSlide) return;

    // Validate file type for images
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file");
      return;
    }

    // Store file for bulk upload
    const newPendingUploads = new Map(pendingFileUploads);
    newPendingUploads.set(currentSlide.id, file);
    setPendingFileUploads(newPendingUploads);

    // Update local slide state with a preview URL (create object URL for preview)
    const previewUrl = URL.createObjectURL(file);
    const updatedSlides = localSlides.map((slide) =>
      slide.id === currentSlide.id ? { ...slide, imageUrl: previewUrl } : slide
    );
    setLocalSlides(updatedSlides);
    setImageUrlValue(previewUrl);
    setHasUnsavedChanges(true);

    // Force refresh slide renderer
    setSlideRefreshKey((prev) => prev + 1);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle image selection from the image selector dialog
  const handleImageSelect = async (imageData: Blob, blobUrl: string) => {
    if (!currentSlide) return;

    try {
      // Convert blob to File object
      const file = new File([imageData], `image-${Date.now()}.jpg`, {
        type: imageData.type || "image/jpeg",
      });

      // Store file for bulk upload
      const newPendingUploads = new Map(pendingFileUploads);
      newPendingUploads.set(currentSlide.id, file);
      setPendingFileUploads(newPendingUploads);

      // Update local slide state with preview URL
      const updatedSlides = localSlides.map((slide) =>
        slide.id === currentSlide.id ? { ...slide, imageUrl: blobUrl } : slide
      );
      setLocalSlides(updatedSlides);
      setImageUrlValue(blobUrl);
      setHasUnsavedChanges(true);
      setSlideRefreshKey((prev) => prev + 1);

      toast.success("Image updated", {
        position: "bottom-right",
      });
    } catch (error) {
      console.error("Error applying image:", error);
      setUploadError(
        error instanceof Error
          ? error.message
          : "Failed to apply image. Please try again."
      );
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleImageUrlChange = (newUrl: string) => {
    if (!currentSlide) return;

    setImageUrlValue(newUrl);

    // Clear existing timeout
    if (urlUpdateTimeoutRef.current) {
      clearTimeout(urlUpdateTimeoutRef.current);
    }

    // Debounce API call - update after user stops typing
    urlUpdateTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await topicsApi.slides.update(currentSlide.id, {
          imageUrl: newUrl || null,
        });

        if (result.error) {
          throw new Error(result.error.message || "Failed to update slide");
        }

        // Refresh topic data with slides and URLs
        if (topic) {
          const topicResult = await topicsApi.get.byId(topic.id, {
            includeSlides: true,
            includeUrls: true,
          });
          if (topicResult.data) {
            setTopic(topicResult.data);
            // Update slides if they exist
            if ((topicResult.data as any).slides) {
              const updatedSlides = (topicResult.data as any).slides
                .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
                .map((slide: any) => ({
                  id: slide.id,
                  kind: slide.kind as "text" | "image" | "video",
                  orderIndex: slide.orderIndex,
                  textHtml: slide.textHtml ?? null,
                  imageUrl: slide.imageUrl ?? null,
                  videoUrl: slide.videoUrl ?? null,
                  videoStartS: slide.videoStartS ?? null,
                  videoEndS: slide.videoEndS ?? null,
                  effectiveNotes: slide.officialNotes ?? null,
                  signedUrl: slide.signedUrl ?? null,
                }));
              setLocalSlides(updatedSlides);
              // Cache signed URLs
              updatedSlides.forEach((slide) => {
                if (slide.kind === "image" && (slide as any).signedUrl) {
                  setSlideUrl(slide.id, (slide as any).signedUrl);
                }
              });
            }
          }
        }
      } catch (err) {
        console.error("Update error:", err);
        setUploadError(
          err instanceof Error ? err.message : "Failed to update URL"
        );
      }
    }, 1000); // Wait 1 second after user stops typing
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current);
      }
    };
  }, []);

  const goToPrevious = useCallback(() => {
    if (canGoPrev) {
      setCurrentSlideIndex((prev) => prev - 1);
    }
  }, [canGoPrev]);

  const goToNext = useCallback(() => {
    if (canGoNext) {
      setCurrentSlideIndex((prev) => prev + 1);
    }
  }, [canGoNext]);

  // Keyboard navigation
  useEffect(() => {
    if (isLoading || error || slides.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere if user is typing in an input, textarea, or contenteditable element
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, error, slides.length, goToPrevious, goToNext]);

  // Scroll to center selected slide in gallery
  useEffect(() => {
    if (!slideGalleryRef.current || slides.length === 0) return;

    const container = slideGalleryRef.current;
    const slideElements = container.querySelectorAll("button");
    const selectedSlide = slideElements[currentSlideIndex];

    if (selectedSlide) {
      const containerRect = container.getBoundingClientRect();
      const slideRect = selectedSlide.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      const slideCenter = slideRect.left + slideRect.width / 2;
      const scrollOffset = slideCenter - containerCenter;

      container.scrollBy({
        left: scrollOffset,
        behavior: "smooth",
      });
    }
  }, [currentSlideIndex, slides.length]);

  // Prevent navigation/refresh while saving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSaving) {
        e.preventDefault();
        e.returnValue = "Changes are being saved. Please wait...";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isSaving]);

  // Handle slide reordering via @dnd-kit
  const handleDragStart = (event: DragStartEvent) => {
    setActiveSlideId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !topic) {
      setActiveSlideId(null);
      return;
    }

    const activeIndex = slides.findIndex((s) => s.id === active.id);
    const overIndex = slides.findIndex((s) => s.id === over.id);

    if (activeIndex === -1 || overIndex === -1) {
      setActiveSlideId(null);
      return;
    }

    // Don't do anything if we're dropping at the same position
    if (activeIndex === overIndex) {
      setActiveSlideId(null);
      return;
    }

    setIsReordering(true);

    try {
      // Reorder slides using arrayMove
      const newSlides = arrayMove(slides, activeIndex, overIndex);

      // Update orderIndex for all slides
      const reorderedSlides = newSlides.map((slide, index) => ({
        ...slide,
        orderIndex: index,
      }));

      setLocalSlides(reorderedSlides);
      setHasUnsavedChanges(true);

      // Update current slide index to track the dragged slide
      const newDraggedIndex = reorderedSlides.findIndex(
        (s) => s.id === active.id
      );

      if (newDraggedIndex !== -1) {
        setCurrentSlideIndex(newDraggedIndex);
      }
    } catch (err) {
      console.error("Failed to reorder slides:", err);
      setUploadError(
        err instanceof Error ? err.message : "Failed to reorder slides"
      );
    } finally {
      setIsReordering(false);
      setActiveSlideId(null);
    }
  };

  const handleDragCancel = () => {
    setActiveSlideId(null);
  };

  // Handle creating a new slide at a specific position (local state only)
  const handleCreateSlide = (insertAfterIndex: number) => {
    if (!topic) return;

    // Open image selector dialog in multiple selection mode
    setInsertAfterIndexForDialog(insertAfterIndex);
    setShowImageSelectorDialog(true);
  };

  // Handle inserting multiple slides at a specific position
  const handleInsertMultipleSlides = async (
    images: Array<{ imageData: Blob; blobUrl: string }>,
    insertAfterIndex: number
  ) => {
    console.log("[topic-detail] handleInsertMultipleSlides called:", {
      imagesCount: images.length,
      insertAfterIndex,
      currentSlidesCount: localSlides.length,
    });
    
    if (!topic || images.length === 0) {
      console.warn("[topic-detail] handleInsertMultipleSlides: No topic or images, returning early");
      return;
    }

    // Create new slides for each image and collect files
    const newPendingUploads = new Map(pendingFileUploads);
    const newSlides: ExtendedSlideData[] = images.map((image, index) => {
      const tempId = `temp_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;

      // Convert blob to File object for upload
      const file = new File(
        [image.imageData],
        `image-${Date.now()}-${index}.jpg`,
        {
          type: image.imageData.type || "image/jpeg",
        }
      );

      // Store file for bulk upload (add to the same Map)
      newPendingUploads.set(tempId, file);

      const slide = {
        id: tempId,
        kind: "image" as const,
        orderIndex: insertAfterIndex + 1 + index, // Will be reordered below
        textHtml: null,
        imageUrl: image.blobUrl, // Use blob URL for preview
        videoUrl: null,
        videoStartS: null,
        videoEndS: null,
        effectiveNotes: null,
        quizData: null,
      };
      
      console.log("[topic-detail] Creating new slide:", {
        id: slide.id,
        kind: slide.kind,
        hasImageUrl: !!slide.imageUrl,
        hasPendingUpload: true,
      });
      
      return slide;
    });
    
    console.log("[topic-detail] Created", newSlides.length, "new slides with content");

    // Update pending uploads once with all files
    setPendingFileUploads(newPendingUploads);

    // Insert slides at correct position (after insertAfterIndex)
    const updatedSlides = [...localSlides];
    updatedSlides.splice(insertAfterIndex + 1, 0, ...newSlides);

    // Reorder all slides to have sequential orderIndex
    const reorderedSlides = updatedSlides.map((slide, index) => ({
      ...slide,
      orderIndex: index,
    }));

    setLocalSlides(reorderedSlides);
    setHasUnsavedChanges(true);

    // Navigate to the first newly created slide
    const firstNewSlideIndex = reorderedSlides.findIndex(
      (s) => s.id === newSlides[0].id
    );
    if (firstNewSlideIndex !== -1) {
      setCurrentSlideIndex(firstNewSlideIndex);
    }

    setHoveredSlideIndex(null);
    setSlideRefreshKey((prev) => prev + 1);
  };

  // Handle inserting a video slide (YouTube or Vimeo) at a specific position
  const handleInsertVideo = (
    videoUrl: string,
    insertAfterIndex: number
  ) => {
    if (!topic) return;

    // Generate temporary ID for new slide
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create new video slide
    const newSlide: ExtendedSlideData = {
      id: tempId,
      kind: "video" as const,
      orderIndex: insertAfterIndex + 1, // Will be reordered below
      textHtml: null,
      imageUrl: null,
      videoUrl: videoUrl,
      videoStartS: null,
      videoEndS: null,
      effectiveNotes: null,
      quizData: null,
    };

    // Insert slide at correct position (after insertAfterIndex)
    const updatedSlides = [...localSlides];
    updatedSlides.splice(insertAfterIndex + 1, 0, newSlide);

    // Reorder all slides to have sequential orderIndex
    const reorderedSlides = updatedSlides.map((slide, index) => ({
      ...slide,
      orderIndex: index,
    }));

    setLocalSlides(reorderedSlides);
    setHasUnsavedChanges(true);

    // Navigate to the newly created slide
    const newSlideIndex = reorderedSlides.findIndex((s) => s.id === tempId);
    if (newSlideIndex !== -1) {
      setCurrentSlideIndex(newSlideIndex);
    }

    setHoveredSlideIndex(null);
    setSlideRefreshKey((prev) => prev + 1);
  };

  // Handle deleting the current slide (local state only)
  const handleDeleteSlide = () => {
    if (!currentSlide) return;

    const slideToDelete = currentSlide;

    // Mark slide for deletion
    const newDeletedIds = new Set(deletedSlideIds);
    newDeletedIds.add(slideToDelete.id);
    setDeletedSlideIds(newDeletedIds);
    setHasUnsavedChanges(true);

    // Navigate to the previous slide, or the first slide if we deleted the first one
    const remainingSlides = localSlides.filter((s) => !newDeletedIds.has(s.id));
    const newIndex = Math.max(
      0,
      Math.min(currentSlideIndex, remainingSlides.length - 1)
    );
    setCurrentSlideIndex(newIndex);

    setShowDeleteDialog(false);
  };

  // Validate that all new slides have images, videos, or quiz data
  const validateNewSlides = (): { isValid: boolean; message?: string } => {
    const newSlides = localSlides.filter(
      (s) => s.id.startsWith("temp_") && !deletedSlideIds.has(s.id)
    );

    for (const slide of newSlides) {
      const extendedSlide = slide as ExtendedSlideData;
      const hasFileUpload = pendingFileUploads.has(slide.id);
      const hasImageUrl = !!slide.imageUrl;
      const hasVideoUrl = !!slide.videoUrl;
      const hasTextHtml =
        !isCertification && slide.kind === "text" && slide.textHtml;

      if (slide.kind === "text" && !isCertification) {
        // Text slides need textHtml
        if (!hasTextHtml) {
          return {
            isValid: false,
            message: "Text slides must have content.",
          };
        }
      } else if (!hasFileUpload && !hasImageUrl && !hasVideoUrl) {
        // Image/video slides need an image or video
        return {
          isValid: false,
          message:
            "You have a slide that does not have an image. Please provide an image before saving changes.",
        };
      }
    }

    return { isValid: true };
  };

  // Change type for the changes dialog
  type ChangeItem =
    | {
        type: "delete";
        message: string;
        slideNumber: number;
        slide: ExtendedSlideData;
      }
    | {
        type: "new";
        message: string;
        slide: ExtendedSlideData;
        slideNumber: number;
      }
    | {
        type: "replace";
        message: string;
        slideNumber: number;
        slide: ExtendedSlideData;
        oldSlide: ExtendedSlideData;
      }
    | {
        type: "reorder";
        message: string;
        slide: ExtendedSlideData;
        oldPosition: number;
        newPosition: number;
      };

  // Calculate differences between original and current slides
  const calculateChanges = (): ChangeItem[] => {
    const changes: ChangeItem[] = [];

    // Get original slides sorted by orderIndex
    const originalSorted = [...originalSlides].sort(
      (a, b) => a.orderIndex - b.orderIndex
    );

    // Get current slides sorted by orderIndex (excluding deleted)
    const currentSorted = localSlides
      .filter((s) => !deletedSlideIds.has(s.id))
      .sort((a, b) => a.orderIndex - b.orderIndex);

    // Find deleted slides (from original that are now deleted)
    const deletedSlides = originalSlides.filter((s) =>
      deletedSlideIds.has(s.id)
    );
    for (const deletedSlide of deletedSlides) {
      // Find original position (1-indexed) in the original sorted list
      const originalIdx = originalSorted.findIndex(
        (s) => s.id === deletedSlide.id
      );
      if (originalIdx >= 0) {
        changes.push({
          type: "delete",
          message: `Slide ${originalIdx + 1} deleted`,
          slideNumber: originalIdx + 1,
          slide: deletedSlide as ExtendedSlideData,
        });
      }
    }

    // Find replaced images (existing slides with changed imageUrl)
    const existingSlides = currentSorted.filter(
      (s) => !s.id.startsWith("temp_")
    );
    for (const currentSlide of existingSlides) {
      const originalSlide = originalSlides.find(
        (s) => s.id === currentSlide.id
      );
      if (originalSlide) {
        // Check if image was replaced
        const imageReplaced =
          originalSlide.imageUrl !== currentSlide.imageUrl &&
          (originalSlide.imageUrl || currentSlide.imageUrl);
        if (imageReplaced) {
          const slideIndex = currentSorted.findIndex(
            (s) => s.id === currentSlide.id
          );
          const slideNumber = slideIndex + 1;
          changes.push({
            type: "replace",
            message: `Slide ${slideNumber} image replaced`,
            slideNumber: slideNumber,
            slide: currentSlide as ExtendedSlideData,
            oldSlide: originalSlide as ExtendedSlideData,
          });
        }
      }
    }

    // Find new slides (temp IDs) and determine their insertion points
    const newSlides = currentSorted.filter((s) => s.id.startsWith("temp_"));

    for (const newSlide of newSlides) {
      const newSlideIndex = currentSorted.findIndex(
        (s) => s.id === newSlide.id
      );
      // Final slide number (1-indexed) in the final order
      const finalSlideNumber = newSlideIndex + 1;

      changes.push({
        type: "new",
        message: `Added slide ${finalSlideNumber}`,
        slide: newSlide,
        slideNumber: finalSlideNumber,
      });
    }

    // Check for reordering (only if no new slides and no deletions)
    if (newSlides.length === 0 && deletedSlides.length === 0) {
      const originalExistingIds = originalSorted
        .map((s) => s.id)
        .filter((id) => !id.startsWith("temp_"));
      const currentExistingIds = currentSorted
        .map((s) => s.id)
        .filter((id) => !id.startsWith("temp_"));

      // Check if order changed
      const orderChanged =
        originalExistingIds.length === currentExistingIds.length &&
        originalExistingIds.some((id, idx) => currentExistingIds[idx] !== id);

      if (orderChanged) {
        // Find all slides that moved to a different position
        for (let i = 0; i < originalExistingIds.length; i++) {
          const slideId = originalExistingIds[i];
          const newIndex = currentExistingIds.findIndex((id) => id === slideId);

          // If the slide moved to a different position
          if (newIndex !== -1 && newIndex !== i) {
            const slide = currentSorted.find((s) => s.id === slideId);
            if (slide) {
              changes.push({
                type: "reorder",
                message: `Slide ${i + 1} moved to position ${newIndex + 1}`,
                slide: slide as ExtendedSlideData,
                oldPosition: i + 1, // 1-indexed
                newPosition: newIndex + 1, // 1-indexed
              });
            }
          }
        }
      }
    }

    return changes;
  };

  // Actual save function (called after confirmation)
  const performSave = async () => {
    if (!topic || isSaving) return;
    if (!isCertification && !stage) return;

    setIsSaving(true);
    setUploadError(null);
    setSaveProgress(0);

    // Analyze what operations will be performed
    const hasFileUploads = pendingFileUploads.size > 0;
    const hasCreates = localSlides.some((s) => s.id.startsWith("temp_"));
    const hasUpdates = localSlides.some(
      (s) =>
        !s.id.startsWith("temp_") &&
        !deletedSlideIds.has(s.id) &&
        pendingFileUploads.has(s.id)
    );
    const hasDeletes = deletedSlideIds.size > 0;
    const hasReorder = (() => {
      const originalSorted = [...originalSlides]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((s) => s.id)
        .filter((id) => !id.startsWith("temp_"));
      const currentSorted = localSlides
        .filter((s) => !deletedSlideIds.has(s.id))
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((s) => s.id)
        .filter((id) => !id.startsWith("temp_"));
      return (
        originalSorted.length === currentSorted.length &&
        originalSorted.some((id, idx) => currentSorted[idx] !== id)
      );
    })();

    // Set initial status based on operations
    if (hasFileUploads) {
      setSaveStatus("Uploading files...");
    } else if (hasCreates) {
      setSaveStatus("Creating slides...");
    } else if (hasDeletes) {
      setSaveStatus("Deleting slides...");
    } else if (hasReorder) {
      setSaveStatus("Reordering slides...");
    } else if (hasUpdates) {
      setSaveStatus("Updating slides...");
    } else {
      setSaveStatus("Saving changes...");
    }

    try {
      // Extract stage code/number for file paths
      let stageCodeForPath: string;
      let topicNumber: number | null | undefined;

      if (isCertification) {
        // For certification, use stageCode prop or extract from topic
        stageCodeForPath = stageCode || (topic as any).stage?.code || "C";
        topicNumber = (topic as CertificationTopic).courseOrder;
      } else {
        // For curriculum, extract stage number from stage.code (e.g., "S1" -> 1)
        const stageNumberMatch = (stage as any).code.match(/^S(\d+)$/);
        if (!stageNumberMatch) {
          throw new Error("Invalid stage code format");
        }
        stageCodeForPath = `s${parseInt(stageNumberMatch[1], 10)}`;
        topicNumber = (topic as Topic).stageOrder;
      }

      if (topicNumber === null || topicNumber === undefined) {
        throw new Error("Topic stageOrder is missing");
      }

      // Step 1: Prepare operations
      const activeSlides = localSlides.filter(
        (s) => !deletedSlideIds.has(s.id)
      );

      // Filter out empty slides (slides without images, videos, quiz data, or text)
      // Also automatically mark empty existing slides for deletion
      console.log("[topic-detail] performSave: Filtering slides before save:", {
        totalActiveSlides: activeSlides.length,
        pendingFileUploads: pendingFileUploads.size,
      });
      
      const validSlides: typeof activeSlides = [];
      const newDeletedIds = new Set(deletedSlideIds);

      for (const slide of activeSlides) {
        const extendedSlide = slide as ExtendedSlideData;
        const hasImageUrl = !!slide.imageUrl;
        const hasVideoUrl = !!slide.videoUrl;
        const hasQuizData =
          isCertification &&
          extendedSlide.kind === "quiz" &&
          extendedSlide.quizData;
        const hasTextHtml =
          !isCertification && slide.kind === "text" && slide.textHtml;
        const hasPendingUpload = pendingFileUploads.has(slide.id);

        const slideContent = {
          id: slide.id,
          kind: slide.kind,
          hasImageUrl,
          hasVideoUrl,
          hasQuizData: !!hasQuizData,
          hasTextHtml: !!hasTextHtml,
          hasPendingUpload,
          isTemp: slide.id.startsWith("temp_"),
        };

        // Keep slide if it has any content or a pending upload
        if (
          hasImageUrl ||
          hasVideoUrl ||
          hasQuizData ||
          hasTextHtml ||
          hasPendingUpload
        ) {
          validSlides.push(slide);
          console.log("[topic-detail] performSave: Keeping slide with content:", slideContent);
        } else {
          // Empty slide - mark for deletion if it's an existing slide (not a temp slide)
          console.warn("[topic-detail] performSave: Found empty slide:", slideContent);
          if (!slide.id.startsWith("temp_")) {
            console.log("[topic-detail] performSave: Marking existing empty slide for deletion:", slide.id);
            newDeletedIds.add(slide.id);
          } else {
            console.log("[topic-detail] performSave: Skipping temp slide without content (won't be created):", slide.id);
          }
          // Temp slides without content are simply not included (they won't be created)
        }
      }
      
      console.log("[topic-detail] performSave: After filtering:", {
        validSlides: validSlides.length,
        emptySlidesMarkedForDeletion: newDeletedIds.size - deletedSlideIds.size,
        totalToDelete: newDeletedIds.size,
      });

      const sortedSlides = [...validSlides].sort(
        (a, b) => a.orderIndex - b.orderIndex
      );

      // Use the updated deleted IDs set (includes empty slides marked for deletion)
      const finalDeletedIds = Array.from(newDeletedIds);

      // Separate slides into creates and updates
      const creates: any[] = [];
      const updates: any[] = [];
      const slideIds: string[] = [];

      for (const slide of sortedSlides) {
        const extendedSlide = slide as ExtendedSlideData;
        if (slide.id.startsWith("temp_")) {
          // New slide - include tempId so server can map files
          const createData: any = {
            tempId: slide.id, // Include tempId for file mapping
            orderIndex: slide.orderIndex,
            kind: slide.kind,
            // Don't include imageUrl - server will upload file and set it
            videoUrl: slide.videoUrl || null,
            textHtml: slide.textHtml || null,
            videoStartS: slide.videoStartS || null,
            videoEndS: slide.videoEndS || null,
          };
          // Add quiz data for certification
          if (isCertification && extendedSlide.quizData) {
            createData.quizData = extendedSlide.quizData;
          }
          creates.push(createData);
        } else {
          // Existing slide - check if it has a pending file upload
          const updateData: any = {
            id: slide.id,
            kind: slide.kind,
            // For existing slides, if there's a file upload, we'll handle it separately
            // Otherwise keep existing imageUrl
            imageUrl: pendingFileUploads.has(slide.id)
              ? null
              : slide.imageUrl || null,
            videoUrl: slide.videoUrl || null,
            textHtml: slide.textHtml || null,
            videoStartS: slide.videoStartS || null,
            videoEndS: slide.videoEndS || null,
          };
          // Add quiz data for certification
          if (isCertification) {
            updateData.quizData = extendedSlide.quizData || null;
            // Clear imageUrl and videoUrl for quiz slides (database constraint)
            if (slide.kind === "quiz") {
              updateData.imageUrl = null;
              updateData.videoUrl = null;
              updateData.textHtml = null;
            }
          }
          updates.push(updateData);
          slideIds.push(slide.id);
        }
      }

      // Step 2: Prepare FormData with operations and files
      const formData = new FormData();
      formData.append(
        "operations",
        JSON.stringify({
          topicId: topic.id,
          creates,
          updates,
          deletes: finalDeletedIds,
          reorder: slideIds,
        })
      );

      // Add files for new slides (keyed by tempId)
      for (const [tempId, file] of pendingFileUploads.entries()) {
        if (tempId.startsWith("temp_")) {
          formData.append(`file_${tempId}`, file);
        }
      }

      // Add files for existing slides (keyed by slideId)
      for (const [slideId, file] of pendingFileUploads.entries()) {
        if (!slideId.startsWith("temp_")) {
          formData.append(`file_${slideId}`, file);
        }
      }

      // Check total payload size and chunk if necessary
      let totalSize = 0;
      const fileCount = pendingFileUploads.size;
      for (const file of pendingFileUploads.values()) {
        totalSize += file.size;
      }
      const sizeInMB = totalSize / (1024 * 1024);
      const operationsJson = JSON.stringify({
        topicId: topic.id,
        creates,
        updates,
        deletes: finalDeletedIds,
        reorder: slideIds,
      });
      const operationsSize = operationsJson.length;
      const totalPayloadSizeMB = (totalSize + operationsSize) / (1024 * 1024);
      
      console.log("[topic-detail] Upload size check:", {
        fileCount,
        totalSizeMB: sizeInMB.toFixed(2),
        operationsSize,
        totalPayloadSizeMB: totalPayloadSizeMB.toFixed(2),
      });

      // Chunk size limit: 3.5MB to be safe (Vercel limit is ~4.5MB, but we account for FormData overhead)
      const MAX_CHUNK_SIZE_MB = 3.5;
      const MAX_CHUNK_SIZE_BYTES = MAX_CHUNK_SIZE_MB * 1024 * 1024;

      // Helper function to create a chunk
      const createChunk = (
        chunkCreates: typeof creates,
        chunkUpdates: typeof updates,
        chunkDeletes: string[],
        chunkFiles: Map<string, File>
      ) => {
        const chunkFormData = new FormData();
        chunkFormData.append(
          "operations",
          JSON.stringify({
            topicId: topic.id,
            creates: chunkCreates,
            updates: chunkUpdates,
            deletes: chunkDeletes,
            reorder: [], // We'll handle reorder at the end
          })
        );

        for (const [key, file] of chunkFiles.entries()) {
          if (key.startsWith("temp_")) {
            chunkFormData.append(`file_${key}`, file);
          } else {
            chunkFormData.append(`file_${key}`, file);
          }
        }

        return chunkFormData;
      };

      // Helper function to estimate chunk size
      const estimateChunkSize = (
        chunkCreates: typeof creates,
        chunkUpdates: typeof updates,
        chunkFiles: Map<string, File>
      ): number => {
        let size = JSON.stringify({
          topicId: topic.id,
          creates: chunkCreates,
          updates: chunkUpdates,
          deletes: [],
          reorder: [],
        }).length;

        for (const file of chunkFiles.values()) {
          size += file.size;
        }

        return size;
      };

      // Check if we need to chunk
      if (totalPayloadSizeMB <= MAX_CHUNK_SIZE_MB) {
        // Single request - no chunking needed
        console.log("[topic-detail] Payload size OK, sending single request");

        // Update progress: files prepared
        setSaveProgress(hasFileUploads ? 20 : 40);

        // Step 3: Call bulk save API with FormData
        if (hasFileUploads) {
          setSaveStatus("Uploading files...");
        } else {
          setSaveStatus("Processing changes...");
        }

        var result = isCertification
          ? await certificationApi.topics.slides.bulkSave(topic.id, formData)
          : await topicsApi.slides.bulkSave(formData);

        if (result.error) {
          throw new Error(result.error.message || "Failed to save changes");
        }
      } else {
        // Need to chunk - split into multiple requests
        console.log(
          `[topic-detail] Payload too large (${totalPayloadSizeMB.toFixed(2)} MB), chunking into smaller batches...`
        );

        const chunks: Array<{
          creates: typeof creates;
          updates: typeof updates;
          deletes: string[];
          files: Map<string, File>;
        }> = [];

        // Strategy: Process deletes first (no files), then chunk creates/updates with their files
        // Step 1: Handle all deletes in first chunk (if any)
        if (finalDeletedIds.length > 0) {
          chunks.push({
            creates: [],
            updates: [],
            deletes: [...finalDeletedIds],
            files: new Map(),
          });
        }

        // Step 2: Chunk creates with their files
        let currentChunkCreates: typeof creates = [];
        let currentChunkFiles = new Map<string, File>();
        let currentChunkSize = 0;

        for (const create of creates) {
          const tempId = create.tempId;
          const file = tempId ? pendingFileUploads.get(tempId) : undefined;
          const fileSize = file ? file.size : 0;
          const createSize = JSON.stringify(create).length;
          const estimatedSize = currentChunkSize + createSize + fileSize;

          // If adding this create would exceed the limit, start a new chunk
          if (
            currentChunkCreates.length > 0 &&
            estimatedSize > MAX_CHUNK_SIZE_BYTES
          ) {
            chunks.push({
              creates: currentChunkCreates,
              updates: [],
              deletes: [],
              files: new Map(currentChunkFiles),
            });
            currentChunkCreates = [];
            currentChunkFiles = new Map();
            currentChunkSize = 0;
          }

          currentChunkCreates.push(create);
          if (file && tempId) {
            currentChunkFiles.set(tempId, file);
          }
          currentChunkSize += createSize + fileSize;
        }

        // Add remaining creates chunk
        if (currentChunkCreates.length > 0) {
          chunks.push({
            creates: currentChunkCreates,
            updates: [],
            deletes: [],
            files: new Map(currentChunkFiles),
          });
        }

        // Step 3: Chunk updates with their files
        let currentChunkUpdates: typeof updates = [];
        currentChunkFiles = new Map();
        currentChunkSize = 0;

        for (const update of updates) {
          const file = pendingFileUploads.get(update.id);
          const fileSize = file ? file.size : 0;
          const updateSize = JSON.stringify(update).length;
          const estimatedSize = currentChunkSize + updateSize + fileSize;

          // If adding this update would exceed the limit, start a new chunk
          if (
            currentChunkUpdates.length > 0 &&
            estimatedSize > MAX_CHUNK_SIZE_BYTES
          ) {
            chunks.push({
              creates: [],
              updates: currentChunkUpdates,
              deletes: [],
              files: new Map(currentChunkFiles),
            });
            currentChunkUpdates = [];
            currentChunkFiles = new Map();
            currentChunkSize = 0;
          }

          currentChunkUpdates.push(update);
          if (file) {
            currentChunkFiles.set(update.id, file);
          }
          currentChunkSize += updateSize + fileSize;
        }

        // Add remaining updates chunk
        if (currentChunkUpdates.length > 0) {
          chunks.push({
            creates: [],
            updates: currentChunkUpdates,
            deletes: [],
            files: new Map(currentChunkFiles),
          });
        }

        console.log(
          `[topic-detail] Split into ${chunks.length} chunks:`,
          chunks.map((c, i) => ({
            chunk: i + 1,
            creates: c.creates.length,
            updates: c.updates.length,
            deletes: c.deletes.length,
            files: c.files.size,
            estimatedSizeMB: (
              estimateChunkSize(c.creates, c.updates, c.files) /
              (1024 * 1024)
            ).toFixed(2),
          }))
        );

        // Process chunks sequentially
        let lastResult: any = null;
        const totalChunks = chunks.length;
        const progressPerChunk = hasFileUploads ? 60 / totalChunks : 80 / totalChunks;

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const chunkNum = i + 1;

          console.log(
            `[topic-detail] Processing chunk ${chunkNum}/${totalChunks}...`
          );

          setSaveStatus(
            `Processing batch ${chunkNum} of ${totalChunks}...`
          );
          setSaveProgress(20 + progressPerChunk * i);

          const chunkFormData = createChunk(
            chunk.creates,
            chunk.updates,
            chunk.deletes,
            chunk.files
          );

          const chunkResult = isCertification
            ? await certificationApi.topics.slides.bulkSave(
                topic.id,
                chunkFormData
              )
            : await topicsApi.slides.bulkSave(chunkFormData);

          if (chunkResult.error) {
            throw new Error(
              chunkResult.error.message ||
                `Failed to save chunk ${chunkNum} of ${totalChunks}`
            );
          }

          lastResult = chunkResult;
        }

        // Step 4: Final reorder operation (if we have slideIds to reorder)
        if (slideIds.length > 0) {
          console.log("[topic-detail] Performing final reorder...");
          setSaveStatus("Reordering slides...");
          setSaveProgress(hasFileUploads ? 85 : 90);

          const reorderFormData = new FormData();
          reorderFormData.append(
            "operations",
            JSON.stringify({
              topicId: topic.id,
              creates: [],
              updates: [],
              deletes: [],
              reorder: slideIds,
            })
          );

          const reorderResult = isCertification
            ? await certificationApi.topics.slides.bulkSave(
                topic.id,
                reorderFormData
              )
            : await topicsApi.slides.bulkSave(reorderFormData);

          if (reorderResult.error) {
            throw new Error(
              reorderResult.error.message || "Failed to reorder slides"
            );
          }

          lastResult = reorderResult;
        }

        // Use the last result for processing (will continue to response handling below)
        result = lastResult;
      }

      // Both single and chunked requests end up here with result set
      if (result.error) {
        throw new Error(result.error.message || "Failed to save changes");
      }

      // Update progress: processing response
      setSaveProgress(hasFileUploads ? 70 : 85);
      setSaveStatus("Processing response...");

      // Step 4: Update local state with server response
      let updatedSlides: ExtendedSlideData[] = [];

      if (result.data) {
        // Update topic if it's included in the response, otherwise keep existing topic
        // Merge response topic with existing topic to preserve fields like title
        if ("topic" in result.data && result.data.topic) {
          // If the response topic has all necessary fields, use it
          // Otherwise, merge it with the existing topic to preserve fields like title
          const responseTopic = result.data.topic;
          if (topic && (!responseTopic.title || !responseTopic.stageOrder)) {
            // Merge: keep existing topic fields, update with response fields (especially slides)
            setTopic({
              ...topic,
              ...responseTopic,
              slides: responseTopic.slides || topic.slides,
            });
          } else {
            // Response has full topic data, use it directly
            setTopic(responseTopic);
          }
        }

        // Update slides from response if available
        // Always use the response topic if available, don't fall back to existing topic
        // as it may have stale data
        const responseTopic =
          "topic" in result.data && result.data.topic
            ? result.data.topic
            : null;

        if (responseTopic?.slides && responseTopic.slides.length > 0) {
          // Create a map of slide IDs that had pending uploads
          const slidesWithUploads = new Set(pendingFileUploads.keys());
          // Create a set of deleted slide IDs for filtering
          const deletedIdsSet = new Set(deletedSlideIds);

          updatedSlides =
            responseTopic.slides
              ?.filter((slide: any) => !deletedIdsSet.has(slide.id)) // Filter out any deleted slides that might still be in response
              ?.sort((a: any, b: any) => a.orderIndex - b.orderIndex)
              .map((slide: any) => {
                // If this slide had a pending upload, ensure we use the server's imageUrl
                // If the server didn't return an imageUrl but we had an upload, log a warning
                const hadUpload = slidesWithUploads.has(slide.id);
                if (hadUpload && !slide.imageUrl) {
                  console.error(
                    `Slide ${slide.id} had a file upload but server response doesn't include imageUrl. Server slide data:`,
                    slide
                  );
                }

                // Ensure we're not using blob URLs - only use server URLs
                const imageUrl =
                  slide.imageUrl && slide.imageUrl.startsWith("blob:")
                    ? null
                    : (slide.imageUrl ?? null);

                return {
                  id: slide.id,
                  kind: slide.kind as
                    | "text"
                    | "image"
                    | "video"
                    | "quiz"
                    | "test",
                  orderIndex: slide.orderIndex,
                  textHtml: slide.textHtml ?? null,
                  // Use server's imageUrl - it should have the uploaded file URL
                  // Never use blob URLs from the response
                  imageUrl,
                  videoUrl: slide.videoUrl ?? null,
                  videoStartS: slide.videoStartS ?? null,
                  videoEndS: slide.videoEndS ?? null,
                  effectiveNotes: slide.officialNotes ?? null,
                  quizData: isCertification
                    ? (slide.quizData as QuizData | null)
                    : null,
                  signedUrl: slide.signedUrl ?? null,
                };
              }) ?? [];
          setLocalSlides(updatedSlides);
        } else {
          // If response doesn't have slides, but we had uploads, this is an error
          if (pendingFileUploads.size > 0) {
            console.error(
              "Server response doesn't include slides but we had file uploads. Response:",
              result.data
            );
            // Don't update localSlides - keep the current state with blobUrls for now
            // The user can try saving again
          } else if (responseTopic) {
            // No slides in response but no uploads - set empty array
            setLocalSlides([]);
            setOriginalSlides([]);
          }
        }

        // Batch invalidate cache for slides that had files uploaded
        const slideIdsToInvalidate = new Set<string>();
        
        // For existing slides with file uploads
        for (const slideId of Array.from(pendingFileUploads.keys())) {
          if (!slideId.startsWith("temp_")) {
            slideIdsToInvalidate.add(slideId);
          }
        }
        
        // For newly created slides, invalidate by matching orderIndex
        if (
          result.data &&
          "topic" in result.data &&
          result.data.topic?.slides
        ) {
          const tempSlidesWithFiles = localSlides.filter(
            (s) => s.id.startsWith("temp_") && pendingFileUploads.has(s.id)
          );
          for (const tempSlide of tempSlidesWithFiles) {
            const createdSlide = result.data.topic.slides.find(
              (s: any) => s.orderIndex === tempSlide.orderIndex
            );
            if (createdSlide) {
              slideIdsToInvalidate.add(createdSlide.id);
            }
          }
        }
        
        // Batch invalidate all slides with uploads at once
        slideIdsToInvalidate.forEach((slideId) => {
          if (isCertification) {
            invalidateCertificationSlide(slideId);
          } else {
            invalidateSlide(slideId);
          }
        });

        // Clear pending changes and update original slides to match saved state
        setPendingFileUploads(new Map());
        setDeletedSlideIds(new Set());
        setHasUnsavedChanges(false);
        // Update originalSlides to match the saved state so future change calculations are correct
        setOriginalSlides(JSON.parse(JSON.stringify(updatedSlides)));
        setSlideRefreshKey((prev) => prev + 1);

        // Invalidate all slide caches for slides that were updated/created
        // This ensures the cache store will refetch fresh URLs
        const allSlideIds = new Set<string>();
        if (updatedSlides.length > 0) {
          updatedSlides.forEach((slide) => allSlideIds.add(slide.id));
        }
        // Also include slides from the response topic if available
        if (responseTopic?.slides) {
          responseTopic.slides.forEach((slide: any) =>
            allSlideIds.add(slide.id)
          );
        }

        // Batch invalidate caches for all slides
        allSlideIds.forEach((slideId) => {
          if (isCertification) {
            invalidateCertificationSlide(slideId);
          } else {
            invalidateSlide(slideId);
          }
        });

        // Update progress: finalizing changes
        setSaveProgress(90);
        setSaveStatus("Finalising changes...");

        // Refetch when: (1) response lacks slides, or (2) we had deletes – ensures server state is authoritative
        const needsRefetch =
          !responseTopic ||
          !responseTopic.slides ||
          responseTopic.slides.length === 0 ||
          deletedSlideIds.size > 0;

        if (needsRefetch) {
          if (isCertification) {
            await fetchTopicData(true);
          } else {
            await refetchTopics();
          }
        }

        // Complete progress
        setSaveProgress(100);
        setSaveStatus("Changes saved successfully!");

        // Show success feedback on button
        setShowSaveSuccess(true);
        setTimeout(() => {
          setShowSaveSuccess(false);
        }, 2000); // Show for 2 seconds

        // Show success toast
        toast.success("Changes saved successfully", {
          position: "bottom-right",
        });
      }
    } catch (err) {
      console.error("Bulk save error:", err);
      
      // Check for payload size errors
      let errorMessage = "Failed to save changes";
      if (err instanceof Error) {
        const errMsg = err.message.toLowerCase();
        if (
          errMsg.includes("too large") ||
          errMsg.includes("payload") ||
          errMsg.includes("413") ||
          errMsg.includes("request entity too large") ||
          errMsg.includes("function_payload_too_large")
        ) {
          errorMessage =
            "Upload too large. Please try compressing your images before uploading, or upload in smaller batches.";
        } else if (
          errMsg.includes("formdata") ||
          errMsg.includes("failed to parse")
        ) {
          errorMessage =
            "Failed to process upload. The request may be too large or corrupted. Please try uploading fewer slides at once.";
        } else {
          errorMessage = err.message;
        }
      }
      
      setUploadError(errorMessage);
      setSaveProgress(0);
      setSaveStatus("Upload failed");
      toast.error(errorMessage, {
        position: "bottom-right",
        duration: 5000, // Show for longer so user can read it
      });
    } finally {
      setIsSaving(false);
      setPendingSave(false);
      // Reset progress after a short delay to allow user to see completion
      setTimeout(() => {
        setSaveProgress(0);
        setSaveStatus("");
        setShowSaveProgressDialog(false);
      }, 500);
    }
  };

  // Handle save button click - validate first, then show confirmation
  const handleBulkSave = () => {
    console.log("handleBulkSave called", {
      topic: !!topic,
      isSaving,
      hasUnsavedChanges,
      stage: !!stage,
      isCertification,
    });

    if (!topic || isSaving) {
      console.log("Early return: !topic or isSaving");
      return;
    }

    if (!isCertification && !stage) {
      console.log("Early return: !stage for curriculum");
      return;
    }

    // Step 1: Validate new slides
    const validation = validateNewSlides();
    if (!validation.isValid) {
      console.log("Validation failed, showing validation dialog");
      setShowValidationDialog(true);
      return;
    }

    // Step 2: Calculate and show changes
    const changes = calculateChanges();
    console.log("Calculated changes:", changes.length, changes);

    // If no changes detected but user clicked save, check if flag was wrong
    if (changes.length === 0) {
      console.log("No changes detected");
      if (!hasUnsavedChanges) {
        // No changes at all
        console.log("No changes and flag is false, showing toast");
        toast.info("No changes to save");
        return;
      }
      // Flag says there are changes but calculateChanges found none
      // This can happen if changes were reverted - save anyway to sync state
      console.log(
        "Flag says changes but calculateChanges found none, saving directly"
      );
      performSave();
      return;
    }

    // Step 3: Show changes confirmation dialog
    console.log(
      "Setting showChangesDialog to true, changes count:",
      changes.length
    );
    // Store the changes before showing dialog to avoid recalculation issues
    if (changes.length > 0) {
      setChangesToShow(changes);
      setShowChangesDialog(true);
      setPendingSave(true);
      console.log("Dialog state set, showChangesDialog should be true now");
    } else {
      console.error("ERROR: Trying to show dialog but changes array is empty!");
      toast.error("No changes detected to save");
    }
  };

  // Handle confirmation of changes
  const handleConfirmChanges = () => {
    // Close the changes dialog and open the progress dialog
    setShowChangesDialog(false);
    setShowSaveProgressDialog(true);
    // Start the save process
    performSave();
  };

  // ── Lesson Plan handlers ──────────────────────────────────────────
  const fetchLessonPlans = useCallback(async () => {
    if (!topic?.id) return;
    setIsLoadingLessonPlans(true);
    try {
      const result = await topicsApi.lessonPlans.list(topic.id);
      if (result.data) {
        setLessonPlans(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch lesson plans:", err);
    } finally {
      setIsLoadingLessonPlans(false);
    }
  }, [topic?.id]);

  // Fetch lesson plans when topic loads
  useEffect(() => {
    if (topic?.id) {
      fetchLessonPlans();
    }
  }, [topic?.id, fetchLessonPlans]);

  const handleLessonPlanUpload = async (file: File) => {
    if (!topic?.id) return;
    setIsUploadingLessonPlan(true);
    try {
      const result = await topicsApi.lessonPlans.upload(topic.id, file);
      if (result.data) {
        toast.success("Lesson plan uploaded", {
          description: file.name,
        });
        await fetchLessonPlans();
      } else {
        toast.error("Upload failed", {
          description: result.error?.message ?? "Unknown error",
        });
      }
    } catch (err: any) {
      toast.error("Upload failed", {
        description: err.message ?? "Unknown error",
      });
    } finally {
      setIsUploadingLessonPlan(false);
      if (lessonPlanFileInputRef.current) {
        lessonPlanFileInputRef.current.value = "";
      }
    }
  };

  const handleLessonPlanDownload = async (planId: string) => {
    try {
      const result = await topicsApi.lessonPlans.getUrl(planId);
      if (result.data?.url) {
        window.open(result.data.url, "_blank");
      } else {
        toast.error("Failed to get download link");
      }
    } catch (err: any) {
      toast.error("Failed to get download link", {
        description: err.message ?? "Unknown error",
      });
    }
  };

  const handleLessonPlanDelete = async (planId: string, fileName: string) => {
    if (!window.confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    setIsDeletingLessonPlan(planId);
    try {
      const result = await topicsApi.lessonPlans.delete(planId);
      if (result.data?.success) {
        toast.success("Lesson plan deleted", { description: fileName });
        await fetchLessonPlans();
      } else {
        toast.error("Delete failed", {
          description: result.error?.message ?? "Unknown error",
        });
      }
    } catch (err: any) {
      toast.error("Delete failed", {
        description: err.message ?? "Unknown error",
      });
    } finally {
      setIsDeletingLessonPlan(null);
    }
  };

  // Show skeleton loaders while loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Topic Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-start gap-8">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-9 w-64" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Slides Section Skeleton */}
        <div className="space-y-8">
          {/* First Row: Current Slide Preview + Slide Info */}
          <div className="grid grid-cols-5 gap-6">
            {/* Current Slide Preview Skeleton - 3/5 width */}
            <div className="col-span-3 relative aspect-video">
              <Card className="h-full">
                <CardContent className="p-0 h-full">
                  <Skeleton className="w-full h-full rounded-lg" />
                </CardContent>
              </Card>
            </div>

            {/* Slide Info Panel Skeleton - 2/5 width */}
            <div className="col-span-2 h-full">
              <Card className="p-6 h-full">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-4 w-24" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-32" />
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </Card>
            </div>
          </div>

          {/* Slide Gallery Skeleton */}
          <Card className="relative overflow-visible p-0 border-none shadow-none">
            <CardContent className="relative space-y-4 overflow-visible p-0 border-none">
              {/* Navigation Controls Skeleton */}
              <div className="flex items-center justify-center gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-9 w-20" />
              </div>

              {/* Slide Gallery Skeleton */}
              <div className="flex gap-4 overflow-x-auto py-3 px-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton
                    key={i}
                    className="h-[101px] w-[180px] flex-shrink-0 rounded-lg"
                    style={{ aspectRatio: "16 / 9" }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/admin/content/curriculum/${stageSlug}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stage
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p className="font-medium">Error loading topic</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/admin/content/curriculum/${stageSlug}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stage
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p className="font-medium">Topic not found</p>
              <p className="text-sm mt-2">
                The topic you're looking for doesn't exist.
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
      {/* <Button
        variant="ghost"
        onClick={() => router.push(`/admin/content/curriculum/${stageSlug}`)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Stage
      </Button> */}

      {/* Topic Header */}
      <div className="flex items-center justify-between">
        <div className=" flex items-center justify-start gap-8">
          <div className="flex items-center gap-2">
            <FileText className="text-primary" />
            {isCertification ? (
              <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setIsEditTopicDrawerOpen(true)}
              >
                <h1 className="text-3xl font-bold tracking-tight group-hover:text-primary transition-colors">
                  {topic.title}
                </h1>
                <Pencil className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            ) : (
              <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setIsEditCurriculumTopicDrawerOpen(true)}
              >
                <h1 className="text-3xl font-bold tracking-tight group-hover:text-primary transition-colors">
                  {topic.title}
                </h1>
                <Pencil className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {stage && <Badge variant="secondary">{stage.name}</Badge>}
            {(isCertification
              ? (topic as CertificationTopic).courseOrder !== null
              : (topic as Topic).stageOrder !== null) && (
              <Badge variant="outline">
                Topic{" "}
                {isCertification
                  ? (topic as CertificationTopic).courseOrder! - 1
                  : (topic as Topic).stageOrder}
              </Badge>
            )}
            {topic.status && (
              <Badge
                className="capitalize"
                variant={
                  topic.status === "published"
                    ? "default"
                    : topic.status === "draft"
                      ? "secondary"
                      : "outline"
                }
              >
                {topic.status}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={() => setShowLessonPlanDialog(true)}
                className="relative"
              >
                <FileText className="h-4 w-4" />
                Lesson Plans
                {lessonPlans.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 h-5 min-w-[20px] px-1.5 text-xs"
                  >
                    {lessonPlans.length}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Manage lesson plans for this topic</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-block">
                <Button
                  variant={
                    showSaveSuccess
                      ? "default"
                      : hasUnsavedChanges
                        ? "default"
                        : "outline"
                  }
                  onClick={handleBulkSave}
                  disabled={
                    isSaving || (!hasUnsavedChanges && !showSaveSuccess)
                  }
                  className={
                    showSaveSuccess
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : hasUnsavedChanges
                        ? "bg-blue-500 hover:bg-blue-600 text-white"
                        : ""
                  }
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : showSaveSuccess ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </TooltipTrigger>
            {!hasUnsavedChanges && !showSaveSuccess && !isSaving && (
              <TooltipContent side="left">
                <p>No changes to save</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>

      {/* Slides Section */}
      {slides.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">No slides available</p>
              <p className="text-sm mt-2">
                This topic doesn't have any slides yet.
              </p>
              <Button
                onClick={() => handleCreateSlide(-1)}
                disabled={isCreatingSlide}
                className="mt-6"
              >
                {isCreatingSlide ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating slide...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Slide
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : currentSlide ? (
        <div className="space-y-8">
          {/* First Row: Current Slide Preview (3/5) + Slide Info (2/5) */}
          <div className="grid grid-cols-5 gap-6">
            {/* Current Slide Preview - 3/5 width */}
            <div className="col-span-3 relative aspect-video">
              {/* Background card - inset by 1px */}
              <Card
                className="absolute inset-[1px] overflow-hidden border-none shadow-none p-0 pointer-events-none"
                style={{
                  backgroundImage: `repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 10px,
                    rgba(0, 0, 0, 0.03) 10px,
                    rgba(0, 0, 0, 0.03) 20px
                  )`,
                }}
              >
                <div className="relative w-full h-full p-[2px]">
                  <div className="relative w-full h-full border-2 border-dashed border-muted-foreground/30 rounded-sm" />
                </div>
              </Card>
              {/* Content - fills outer container */}
              <div className="relative w-full h-full">
                {currentSlide.kind === "quiz" ? (
                  <>
                    {/* Bullyproof Logo - Top Center */}
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                      <Image
                        src="/images/bullyproof-logo.svg"
                        alt="Bullyproof"
                        width={168}
                        height={45}
                        className="h-11 w-auto"
                      />
                    </div>
                    <div className="flex flex-col h-full justify-center space-y-4 pt-4">
                      {/* Question - Centered and Bold */}
                      <div className="text-center">
                        <h2 className="text-2xl font-bold">
                          {(currentSlide as ExtendedSlideData).quizData?.question
                            ? renderQuestionWithUrls(
                                (currentSlide as ExtendedSlideData).quizData!.question,
                                (currentSlide as ExtendedSlideData).quizData!.questionUrls
                              )
                            : "Question"}
                        </h2>
                      </div>
                      {/* Answers - Single Column Grid with Radio Buttons */}
                      <div className="flex justify-center">
                        <RadioGroup
                          className="w-full max-w-md space-y-0"
                          disabled
                        >
                          {(
                            currentSlide as ExtendedSlideData
                          ).quizData?.answers.map(
                            (answer: any, index: number) => (
                              <div
                                key={answer.id || index}
                                className="flex items-center space-x-3 p-3 border rounded-md bg-card"
                              >
                                <RadioGroupItem
                                  value={answer.id || `answer-${index}`}
                                  id={answer.id || `answer-${index}`}
                                />
                                <Label
                                  htmlFor={answer.id || `answer-${index}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  {answer.text || `Answer ${index + 1}`}
                                </Label>
                              </div>
                            )
                          ) || []}
                        </RadioGroup>
                      </div>
                    </div>
                  </>
                ) : (
                  <SlideRenderer
                    key={`${currentSlide.id}-${slideRefreshKey}`}
                    slide={currentSlide}
                    className="w-full h-full"
                    isCertification={isCertification}
                  />
                )}
              </div>
            </div>

            {/* Slide Information Panel - 2/5 width */}
            <div className="col-span-2 h-full">
              <Card className="p-6 h-full">
                <Tabs
                  defaultValue="information"
                  className="w-full h-full flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      Slide {currentSlideIndex + 1} of {slides.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <TabsList className="h-8 w-auto">
                        <TabsTrigger
                          value="information"
                          className="h-7 px-3 text-xs"
                        >
                          <Info className="h-3 w-3" />
                          Information
                        </TabsTrigger>
                        <TabsTrigger value="notes" className="h-7 px-3 text-xs">
                          <StickyNote className="h-3 w-3" />
                          Notes
                        </TabsTrigger>
                      </TabsList>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setShowDeleteDialog(true)}
                        disabled={isDeletingSlide}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <TabsContent
                    value="information"
                    className="mt-0 flex-1 flex flex-col"
                  >
                    <div className="space-y-4 flex-shrink-0">
                      {isImageOrVideo && (
                        <div className="space-y-2">
                          <Label>Slide Type</Label>
                          <Select
                            value={currentSlide.kind}
                            onValueChange={handleTypeChange}
                          >
                            <SelectTrigger className="w-full">
                              <div className="flex items-center gap-2">
                                {currentSlide.kind === "image" ? (
                                  <ImageIcon className="h-4 w-4" />
                                ) : currentSlide.kind === "video" ? (
                                  <VideoIcon className="h-4 w-4" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                                <span className="capitalize">
                                  {currentSlide.kind}
                                </span>
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {!isCertification && (
                                <SelectItem value="text">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Text
                                  </div>
                                </SelectItem>
                              )}
                              <SelectItem value="image">
                                <div className="flex items-center gap-2">
                                  <ImageIcon className="h-4 w-4" />
                                  Image
                                </div>
                              </SelectItem>
                              <SelectItem value="video">
                                <div className="flex items-center gap-2">
                                  <VideoIcon className="h-4 w-4" />
                                  Video
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Image/Video URL Inputs */}
                      {currentSlide.kind === "image" && (
                        <div className="space-y-3 flex-shrink-0">
                          <Label htmlFor="image-url">Image URL</Label>
                          <Input
                            id="image-url"
                            value={imageUrlValue}
                            readOnly
                            disabled
                            className="truncate bg-muted cursor-not-allowed"
                            placeholder="No image URL set"
                          />
                          {uploadError && (
                            <p className="text-sm text-destructive">
                              {uploadError}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Change Image Button - fills remaining space */}
                    {currentSlide.kind === "image" && (
                      <div className="flex-1 flex items-end mt-auto pt-4">
                        <Button
                          ref={uploadButtonRef}
                          type="button"
                          variant="outline"
                          onClick={() => setShowImageSelectorDialog(true)}
                          disabled={isUploading}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`w-full h-full min-h-[120px] text-base flex flex-col items-center justify-center gap-2 border-2 border-dashed transition-all !shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] ${
                            isDragging
                              ? "border-primary bg-primary/10 !shadow-[inset_0_3px_6px_rgba(0,0,0,0.15)]"
                              : "border-muted-foreground/30 bg-muted/5 hover:border-muted-foreground/50 hover:bg-muted/10"
                          }`}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-6 w-6 animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="h-6 w-6" />
                              <span>Click to change image</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    {currentSlide.kind === "video" && (
                      <div className="space-y-2 mt-4">
                        <Label htmlFor="video-url">Video URL</Label>
                        <Input
                          id="video-url"
                          value={videoUrlValue}
                          onChange={(e) => handleVideoUrlChange(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                          disabled={isUploading}
                        />
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="notes" className="mt-0 flex-1">
                    <div className="space-y-2 h-full">
                      <Tabs
                        defaultValue="official"
                        className="w-full h-full flex flex-col"
                      >
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="official">
                            Official Notes
                          </TabsTrigger>
                          <TabsTrigger value="teacher">
                            Teacher Notes
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="official" className="mt-4 flex-1">
                          {currentSlide.effectiveNotes ? (
                            <p className="text-sm text-foreground bg-muted/50 p-3 rounded-md">
                              {currentSlide.effectiveNotes}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                              No official notes available for this slide.
                            </p>
                          )}
                        </TabsContent>
                        <TabsContent value="teacher" className="mt-4 flex-1">
                          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                            No teacher notes available for this slide.
                          </p>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </div>

          {/* Second Row: Slide Gallery with Navigation */}
          <Card className="relative overflow-visible p-0 border-none shadow-none">
            <CardContent className="relative space-y-4 overflow-visible p-0 border-none">
              {/* Navigation Controls */}
              {slides.length > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevious}
                    disabled={!canGoPrev}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  <div className="text-sm text-muted-foreground px-4">
                    Slide {currentSlideIndex + 1} of {slides.length}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNext}
                    disabled={!canGoNext}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}

              {/* Slide Gallery */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={slides.map((s) => s.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <div
                    ref={setGalleryRef}
                    className="flex gap-4 overflow-x-auto overflow-y-visible py-3 px-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent relative"
                    onMouseLeave={() => {
                      // Clear all hover states when leaving the gallery
                      setHoveredSlideIndex(null);
                      setShowAddButton(null);
                      // Clear any pending timeouts
                      if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current);
                        hoverTimeoutRef.current = null;
                      }
                      if (hideButtonTimeoutRef.current) {
                        clearTimeout(hideButtonTimeoutRef.current);
                        hideButtonTimeoutRef.current = null;
                      }
                    }}
                  >
                    {slides.map((slide, index) => {
                      const isLastSlide = index === slides.length - 1;
                      const showAddButtonForSlide =
                        (isLastSlide || showAddButton === index) &&
                        !activeSlideId &&
                        !isReordering;

                      return (
                        <SortableSlideItem
                          key={slide.id}
                          slide={slide}
                          index={index}
                          isActive={activeSlideId === slide.id}
                          currentSlideIndex={currentSlideIndex}
                          slideRefreshKey={slideRefreshKey}
                          isReordering={isReordering}
                          hoveredSlideIndex={hoveredSlideIndex}
                          showAddButton={showAddButton}
                          isCertification={isCertification}
                          onSlideClick={() => {
                            if (!isReordering) {
                              setCurrentSlideIndex(index);
                            }
                          }}
                          onMouseEnter={() => {
                            if (!activeSlideId && !isReordering) {
                              setHoveredSlideIndex(index);
                              // Don't show add button on hover for the last slide (it's always visible)
                              if (!isLastSlide) {
                                // Clear any existing timeout
                                if (hoverTimeoutRef.current) {
                                  clearTimeout(hoverTimeoutRef.current);
                                }
                                // Set timeout to show button after 300ms
                                hoverTimeoutRef.current = setTimeout(() => {
                                  setShowAddButton(index);
                                }, 300);
                              } else {
                                setShowAddButton(index);
                              }
                            }
                          }}
                          onMouseLeave={() => {
                            setHoveredSlideIndex(null);
                            // Don't hide add button for the last slide (it's always visible)
                            if (!isLastSlide) {
                              // Clear timeout if mouse leaves before 300ms
                              if (hoverTimeoutRef.current) {
                                clearTimeout(hoverTimeoutRef.current);
                                hoverTimeoutRef.current = null;
                              }
                              // Hide button after a short delay to allow moving to button
                              if (hideButtonTimeoutRef.current) {
                                clearTimeout(hideButtonTimeoutRef.current);
                              }
                              hideButtonTimeoutRef.current = setTimeout(() => {
                                setShowAddButton((current) => {
                                  // Only hide if we're not hovering over the button itself
                                  return current === index ? null : current;
                                });
                              }, 200);
                            }
                          }}
                          onCreateSlide={() => {
                            handleCreateSlide(index);
                          }}
                          hoverTimeoutRef={hoverTimeoutRef}
                          hideButtonTimeoutRef={hideButtonTimeoutRef}
                        />
                      );
                    })}
                  </div>
                  <DragOverlay>
                    {activeSlideId ? (() => {
                      const draggedSlide = slides.find(
                        (s) => s.id === activeSlideId
                      );
                      if (!draggedSlide) return null;
                      return (
                        <div
                          className="flex-shrink-0 relative rounded-lg overflow-hidden shadow-lg bg-background opacity-90 rotate-3 scale-105"
                          style={{
                            width: "180px",
                            aspectRatio: "16 / 9",
                          }}
                        >
                          <div className="w-full h-full relative">
                            <SlideRenderer
                              slide={draggedSlide}
                              className="w-full h-full"
                              thumbnailOnly={true}
                              isCertification={isCertification}
                            />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 text-center text-xs font-medium py-1 px-2 bg-background/80 text-foreground">
                            Slide {draggedSlide.orderIndex + 1}
                          </div>
                        </div>
                      );
                    })() : null}
                  </DragOverlay>
                </SortableContext>
              </DndContext>
              {(isReordering || isCreatingSlide) && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      {isCreatingSlide
                        ? "Creating slide..."
                        : "Reordering slides..."}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Delete Slide Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Slide</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this slide? This action cannot be
              undone. All remaining slides will be reordered accordingly.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeletingSlide}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSlide}
              disabled={isDeletingSlide}
            >
              {isDeletingSlide ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setBulkDeleteSelectedIds(new Set());
                setShowBulkDeleteDialog(true);
              }}
              disabled={isDeletingSlide}
            >
              Bulk Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Slides Dialog */}
      <Dialog
        open={showBulkDeleteDialog}
        onOpenChange={(open) => {
          if (!open) setBulkDeleteSelectedIds(new Set());
          setShowBulkDeleteDialog(open);
        }}
      >
        <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Bulk Delete Slides</DialogTitle>
            <DialogDescription>
              Select slides to remove. Changes are local until you click Save
              Changes.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col min-h-0 flex-1 gap-4">
            <div className="flex items-center justify-between gap-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const slidesForBulk =
                      localSlides.filter((s) => !deletedSlideIds.has(s.id)) ??
                      [];
                    if (bulkDeleteSelectedIds.size === slidesForBulk.length) {
                      setBulkDeleteSelectedIds(new Set());
                    } else {
                      setBulkDeleteSelectedIds(
                        new Set(slidesForBulk.map((s) => s.id))
                      );
                    }
                  }}
                  className="h-8"
                >
                  {(() => {
                    const slidesForBulk = localSlides.filter(
                      (s) => !deletedSlideIds.has(s.id)
                    );
                    return bulkDeleteSelectedIds.size === slidesForBulk.length
                      ? "Deselect All"
                      : "Select All";
                  })()}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {bulkDeleteSelectedIds.size} of{" "}
                  {localSlides.filter((s) => !deletedSlideIds.has(s.id)).length}{" "}
                  selected
                </span>
              </div>
            </div>
            <ScrollArea className="h-[320px] rounded-md border">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
                {localSlides
                  .filter((s) => !deletedSlideIds.has(s.id))
                  .map((slide) => {
                    const isSelected = bulkDeleteSelectedIds.has(slide.id);
                    return (
                      <Card
                        key={slide.id}
                        className={`relative cursor-pointer transition-all hover:shadow-md overflow-hidden p-0 gap-0 flex flex-col ${
                          isSelected ? "ring-2 ring-primary ring-offset-2" : ""
                        }`}
                        onClick={() => {
                          setBulkDeleteSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(slide.id)) {
                              next.delete(slide.id);
                            } else {
                              next.add(slide.id);
                            }
                            return next;
                          })}
                        }
                      >
                        <div className="relative w-full overflow-hidden bg-muted" style={{ aspectRatio: "16/9" }}>
                          <SlideRenderer
                            slide={slide}
                            className="w-full h-full [&_img]:object-cover [&_video]:object-cover"
                            thumbnailOnly={true}
                            isCertification={isCertification}
                          />
                          <div className="absolute top-2 left-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => {
                                setBulkDeleteSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(slide.id)) {
                                    next.delete(slide.id);
                                  } else {
                                    next.add(slide.id);
                                  }
                                  return next;
                                });
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-background/90"
                            />
                          </div>
                        </div>
                        <div className="px-2 py-1 text-center text-xs font-medium text-muted-foreground border-t bg-muted/30 flex-shrink-0">
                          Slide {slide.orderIndex + 1}
                        </div>
                      </Card>
                    );
                  })}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkDeleteSelectedIds(new Set());
                setShowBulkDeleteDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const selectedIds = Array.from(bulkDeleteSelectedIds);
                if (selectedIds.length === 0) return;

                const newDeletedIds = new Set(deletedSlideIds);
                for (const id of selectedIds) {
                  newDeletedIds.add(id);
                }
                setDeletedSlideIds(newDeletedIds);
                setHasUnsavedChanges(true);
                setBulkDeleteSelectedIds(new Set());
                setShowBulkDeleteDialog(false);

                const remainingSlides = localSlides.filter(
                  (s) => !newDeletedIds.has(s.id)
                );
                const currentSlideId = currentSlide?.id;
                if (
                  currentSlideId &&
                  newDeletedIds.has(currentSlideId)
                ) {
                  const newIndex = Math.max(
                    0,
                    Math.min(currentSlideIndex, remainingSlides.length - 1)
                  );
                  setCurrentSlideIndex(newIndex);
                }
              }}
              disabled={bulkDeleteSelectedIds.size === 0}
            >
              Delete Selected ({bulkDeleteSelectedIds.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <Dialog
        open={showUnsavedChangesDialog}
        onOpenChange={setShowUnsavedChangesDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes to this topic. Are you sure you want to
              leave this page? Your changes will be lost if you navigate away
              without saving.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelNavigation}>
              Stay on Page
            </Button>
            <Button variant="destructive" onClick={handleConfirmNavigation}>
              Leave Without Saving
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validation Dialog - Missing Image/Video */}
      <Dialog
        open={showValidationDialog}
        onOpenChange={setShowValidationDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Missing Image</DialogTitle>
            <DialogDescription>
              You have a slide that does not have an image. Please provide an
              image before saving changes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowValidationDialog(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Changes Summary Dialog */}
      <ConfirmChangesDialog
        open={showChangesDialog}
        onOpenChange={setShowChangesDialog}
        changes={changesToShow}
        onConfirm={handleConfirmChanges}
        onCancel={() => {
          setShowChangesDialog(false);
          setPendingSave(false);
          setChangesToShow([]);
        }}
        isSaving={isSaving}
        isCertification={isCertification}
      />

      {/* Save Progress Dialog */}
      <Dialog
        open={showSaveProgressDialog}
        onOpenChange={(open) => {
          // Prevent closing dialog while saving
          if (!isSaving) {
            setShowSaveProgressDialog(open);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Saving Changes
            </DialogTitle>
            <DialogDescription>
              {saveStatus || "Please wait while your changes are being saved..."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">
                  {saveStatus || "Saving..."}
                </span>
                <span className="text-muted-foreground">
                  <CountUp
                    end={saveProgress}
                    duration={2}
                    decimals={0}
                    preserveValue={true}
                  />
                  %
                </span>
              </div>
              <Progress
                value={saveProgress}
                className="h-2"
                indicatorStyle={{
                  transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Selector Dialog */}
      <ImageSelectorDialog
        open={showImageSelectorDialog}
        onOpenChange={(open) => {
          setShowImageSelectorDialog(open);
          if (!open) {
            setInsertAfterIndexForDialog(null);
          }
        }}
        onSelectImage={handleImageSelect}
        onSelectMultipleImages={
          insertAfterIndexForDialog !== null
            ? (images) => {
                handleInsertMultipleSlides(images, insertAfterIndexForDialog);
                setShowImageSelectorDialog(false);
                setInsertAfterIndexForDialog(null);
              }
            : undefined
        }
        onAddVideo={
          insertAfterIndexForDialog !== null
            ? (videoUrl) => {
                handleInsertVideo(videoUrl, insertAfterIndexForDialog);
                setShowImageSelectorDialog(false);
                setInsertAfterIndexForDialog(null);
              }
            : undefined
        }
        allowMultipleSelection={insertAfterIndexForDialog !== null}
      />

      {/* Lesson Plan Dialog */}
      <Dialog open={showLessonPlanDialog} onOpenChange={setShowLessonPlanDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lesson Plans</DialogTitle>
            <DialogDescription>
              Manage lesson plan PDFs for{" "}
              {topic?.title || "this topic"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Upload area */}
            <div className="flex items-center gap-3">
              <input
                ref={lessonPlanFileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLessonPlanUpload(file);
                }}
              />
              <Button
                variant="outline"
                onClick={() => lessonPlanFileInputRef.current?.click()}
                disabled={isUploadingLessonPlan}
              >
                {isUploadingLessonPlan ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isUploadingLessonPlan ? "Uploading..." : "Upload PDF"}
              </Button>
              <p className="text-muted-foreground text-sm">
                PDF files only
              </p>
            </div>

            {/* Plans list */}
            {isLoadingLessonPlans ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : lessonPlans.length === 0 ? (
              <div className="text-muted-foreground rounded-md border border-dashed py-8 text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">No lesson plans uploaded yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lessonPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {plan.fileName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {plan.fileSize
                            ? `${(plan.fileSize / 1024).toFixed(0)} KB`
                            : "Unknown size"}
                          {" · "}
                          {new Date(plan.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleLessonPlanDownload(plan.id)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Open PDF</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive h-8 w-8"
                            onClick={() =>
                              handleLessonPlanDelete(plan.id, plan.fileName)
                            }
                            disabled={isDeletingLessonPlan === plan.id}
                          >
                            {isDeletingLessonPlan === plan.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete lesson plan</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLessonPlanDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Certification Topic Drawer */}
      {isCertification && topic && (
        <EditCertificationTopicDrawer
          open={isEditTopicDrawerOpen}
          onOpenChange={setIsEditTopicDrawerOpen}
          topic={topic as CertificationTopic}
          onTopicUpdated={() => {
            // Refetch topic data after update
            if (topicId) {
              fetchTopicData();
            }
          }}
          onTopicDeleted={() => {
            // Navigate back to stage page after deletion
            if (stageCode) {
              router.push(`/admin/content/certification/${stageCode}`);
            }
          }}
        />
      )}

      {/* Edit Curriculum Topic Drawer */}
      {!isCertification && topic && cachedStage && (
        <EditCurriculumTopicDrawer
          open={isEditCurriculumTopicDrawerOpen}
          onOpenChange={setIsEditCurriculumTopicDrawerOpen}
          topic={topic as Topic}
          onTopicUpdated={async () => {
            // Fetch the updated topic with slides and URLs to update Zustand store
            if (topic?.id) {
              try {
                const result = await topicsApi.get.byId(topic.id, {
                  includeSlides: true,
                  includeUrls: true,
                });
                if (result.data) {
                  // Update Zustand store with the full topic data
                  setTopic(result.data as any);
                }
              } catch (err) {
                console.error("Failed to fetch updated topic:", err);
              }
            }

            // Invalidate React Query cache automatically
            if (topic?.id) {
              invalidateAfterMutation(`/topics/${topic.id}`, { id: topic.id });
            }
            if (cachedStage.id) {
              invalidateAfterMutation(`/stages/${cachedStage.id}`, { id: cachedStage.id });
            }

            // Trigger background refetch (non-blocking)
            refetchTopics();
            refetchStage();
          }}
          onTopicDeleted={async () => {
            // Invalidate React Query cache
            if (cachedStage.id) {
              invalidateAfterMutation(`/stages/${cachedStage.id}`, { id: cachedStage.id });
            }
            if (topic.id) {
              invalidateAfterMutation(`/topics/${topic.id}`, { id: topic.id });
            }
            // Refetch to repopulate data
            await refetchTopics();
            await refetchStage();
            // Navigate back to stage page after deletion
            if (stageSlug) {
              router.push(`/admin/content/curriculum/${stageSlug}`);
            }
          }}
        />
      )}
    </div>
  );
}
