"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { compareSlidesByPosition } from "@/lib/fractional-position";
import { topicsApi } from "@/entities/topics/api/endpoints";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Loader2, Plus } from "lucide-react";
import {
  useTopicsByStage,
  useInvalidateTopics,
} from "@/entities/topics/model/store-enhanced";
import {
  useStageBySlug,
  useInvalidateStage,
} from "@/entities/stages/model/store";
import { useMutationInvalidation } from "@/hooks/use-mutation-invalidation";
import { ImageSelectorDialog } from "@/components/organisms/image-selector-dialog";
import { ConfirmChangesDialog } from "@/components/organisms/confirm-changes-dialog";
import { EditCertificationTopicDrawer } from "./edit-certification-topic-drawer";
import { EditCurriculumTopicDrawer } from "./edit-curriculum-topic-drawer";
import { createSlug } from "@/utils/slug";

import type {
  Topic,
  CertificationTopic,
  TopicContext,
  ExtendedSlideData,
  ChangeItem,
  LessonPlan,
} from "./topic-detail/types";
import { validateNewSlides, calculateChanges } from "./topic-detail/lib";
import { fetchTopicDataImpl } from "./topic-detail/fetch-topic-data";
import { loadCurriculumTopic } from "./topic-detail/load-curriculum-topic";
import { performSaveImpl } from "./topic-detail/perform-save";
import {
  type SlideMutationDeps,
  handleTypeChangeImpl,
  handleFileUploadImpl,
  handleImageSelectImpl,
  handleDragEndImpl,
  handleInsertMultipleSlidesImpl,
  handleInsertVideoImpl,
} from "./topic-detail/slide-handlers";
import { TopicDetailSkeleton } from "./topic-detail/topic-detail-skeleton";
import {
  TopicDetailError,
  TopicDetailNotFound,
} from "./topic-detail/topic-detail-fallbacks";
import { TopicHeader } from "./topic-detail/topic-header";
import { SlidePreview } from "./topic-detail/slide-preview";
import { SlideInfoPanel } from "./topic-detail/slide-info-panel";
import { SlideGallery } from "./topic-detail/slide-gallery";
import { DeleteSlideDialog } from "./topic-detail/delete-slide-dialog";
import { BulkDeleteDialog } from "./topic-detail/bulk-delete-dialog";
import { UnsavedChangesDialog } from "./topic-detail/unsaved-changes-dialog";
import { ValidationDialog } from "./topic-detail/validation-dialog";
import { SaveProgressDialog } from "./topic-detail/save-progress-dialog";
import { LessonPlansDialog } from "./topic-detail/lesson-plans-dialog";

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
    "/admin/content/certification",
  );
  const isCertification = context === "certification" || isCertificationFromUrl;
  const [stage, setStage] = useState<any | null>(null);
  const [topic, setTopic] = useState<Topic | CertificationTopic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const slideGalleryRef = useRef<HTMLDivElement>(null);
  const wheelHandlerRef = useRef<((e: WheelEvent) => void) | null>(null);
  const [isUploading] = useState(false);
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
    null,
  );
  const [showAddButton, setShowAddButton] = useState<number | null>(null);
  // hoverTimeoutRef / hideButtonTimeoutRef (and their unmount cleanup) live in
  // ./topic-detail/slide-gallery - they are used exclusively by that subtree
  const [isCreatingSlide] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeletingSlide] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleteSelectedIds, setBulkDeleteSelectedIds] = useState<
    Set<string>
  >(new Set());

  // Local state for slides (working copy) - ExtendedSlideData lives in ./topic-detail/types
  const [localSlides, setLocalSlides] = useState<ExtendedSlideData[]>([]);
  const [pendingFileUploads, setPendingFileUploads] = useState<
    Map<string, File>
  >(new Map());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [deletedSlideIds, setDeletedSlideIds] = useState<Set<string>>(
    new Set(),
  );
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] =
    useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
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
      changesToShow.length,
    );
  }, [showChangesDialog, changesToShow]);
  const [, setPendingSave] = useState(false);
  const [showImageSelectorDialog, setShowImageSelectorDialog] = useState(false);
  const [insertAfterIndexForDialog, setInsertAfterIndexForDialog] = useState<
    number | null
  >(null);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [isEditTopicDrawerOpen, setIsEditTopicDrawerOpen] = useState(false);
  const [isEditCurriculumTopicDrawerOpen, setIsEditCurriculumTopicDrawerOpen] =
    useState(false);
  const [showLessonPlanDialog, setShowLessonPlanDialog] = useState(false);
  const [lessonPlans, setLessonPlans] = useState<Array<LessonPlan>>([]);
  const [isLoadingLessonPlans, setIsLoadingLessonPlans] = useState(false);

  // @dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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
        wheelHandlerRef.current,
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
          wheelHandlerRef.current,
        );
      }
    };
  }, []);

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
  const setSlideUrl: (slideId: string, url: string) => void = useCallback(
    () => {},
    [],
  );
  // No-op invalidation stubs – TQ invalidation handles freshness (must be stable:
  // fetchTopicData depends on invalidateCertificationSlide; unstable refs cause an infinite refetch loop)
  const invalidateSlide: (slideId: string) => void = useCallback(() => {}, []);
  const invalidateCertificationSlide: (slideId: string) => void = useCallback(
    () => {},
    [],
  );

  // Resolve topic by slug: primary = createSlug(title), fallback = T1/T2 legacy format
  const isLegacyTopicSlug = topicSlug ? /^T\d+$/.test(topicSlug) : false;
  const legacyTopicOrder =
    isLegacyTopicSlug && topicSlug
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
        },
  );

  // Invalidation hooks for curriculum topics
  useInvalidateTopics();
  useInvalidateStage();
  const { invalidateAfterMutation } = useMutationInvalidation();

  // Extract fetchData function so it can be reused after save (for certification and manual refetch)
  // Body moved to ./topic-detail/fetch-topic-data (dependency array unchanged)
  const fetchTopicData = useCallback(
    (skipLoading = false) =>
      fetchTopicDataImpl(
        {
          isCertification,
          topicId,
          excludeQuizSlides,
          setIsLoading,
          setError,
          setTopic,
          setLocalSlides,
          setOriginalSlides,
          setHasUnsavedChanges,
          setDeletedSlideIds,
          setPendingFileUploads,
        },
        skipLoading,
      ),
    [isCertification, topicId, excludeQuizSlides, invalidateCertificationSlide],
  );

  // Handle certification flow
  useEffect(() => {
    if (isCertification) {
      fetchTopicData();
    }
  }, [isCertification, fetchTopicData]);

  // Find the current topic from cached data (memoized to prevent unnecessary recalculations)
  const foundTopic = useMemo(() => {
    if (isCertification || !cachedTopics || !topicSlug) return null;
    return (
      isLegacyTopicSlug
        ? cachedTopics.find((t) => t.stageOrder === legacyTopicOrder)
        : cachedTopics.find((t) => createSlug(t.title) === topicSlug)
    ) as any;
  }, [
    isCertification,
    cachedTopics,
    topicSlug,
    isLegacyTopicSlug,
    legacyTopicOrder,
  ]);

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
  // Body moved to ./topic-detail/load-curriculum-topic (dependency array unchanged)
  useEffect(() => {
    loadCurriculumTopic({
      isCertification,
      stageSlug,
      topicSlug,
      isLoadingStage,
      isLoadingTopics,
      stageError,
      topicsError,
      cachedStage,
      cachedTopics,
      foundTopic,
      topic,
      lastProcessedTopicIdRef,
      setIsLoading,
      setError,
      setStage,
      setTopic,
      setLocalSlides,
      setOriginalSlides,
      setHasUnsavedChanges,
      setDeletedSlideIds,
      setPendingFileUploads,
      setSlideUrl,
    });
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
      if (
        foundTopic.title !== topic.title ||
        foundTopic.status !== topic.status
      ) {
        setTopic({
          ...topic,
          title: foundTopic.title,
          status: foundTopic.status,
        });
      }
    }
  }, [foundTopic, isCertification, topic]);

  // Use local slides instead of topic.slides (sort by position for consistency with Confirm Changes dialog)
  const slides = localSlides
    .filter((s) => !deletedSlideIds.has(s.id))
    .sort(compareSlidesByPosition);
  const currentSlide = slides[currentSlideIndex];

  // Keep currentSlideIndex in bounds when slides list changes (e.g. after bulk delete)
  useEffect(() => {
    if (slides.length === 0) return;
    if (currentSlideIndex >= slides.length) {
      setCurrentSlideIndex(Math.max(0, slides.length - 1));
    }
  }, [slides.length, currentSlideIndex]);
  const canGoPrev = currentSlideIndex > 0;
  const canGoNext = currentSlideIndex < slides.length - 1;
  const isImageOrVideo =
    currentSlide?.kind === "image" || currentSlide?.kind === "video";
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

  // Shared deps for the extracted slide-mutation handler bodies (./topic-detail/slide-handlers)
  const slideMutationDeps: SlideMutationDeps = {
    topic,
    isCertification,
    slides,
    currentSlide,
    localSlides,
    pendingFileUploads,
    fileInputRef,
    setLocalSlides,
    setPendingFileUploads,
    setHasUnsavedChanges,
    setImageUrlValue,
    setVideoUrlValue,
    setUploadError,
    setSlideRefreshKey,
    setCurrentSlideIndex,
    setHoveredSlideIndex,
    setActiveSlideId,
    setIsReordering,
  };

  const handleTypeChange = (newType: string) =>
    handleTypeChangeImpl(slideMutationDeps, newType);

  const handleVideoUrlChange = (newUrl: string) => {
    if (!currentSlide) return;

    setVideoUrlValue(newUrl);

    // Update local slide state
    const updatedSlides = localSlides.map((slide) =>
      slide.id === currentSlide.id
        ? { ...slide, videoUrl: newUrl || null }
        : slide,
    );
    setLocalSlides(updatedSlides);
    setHasUnsavedChanges(true);
  };

  const handleFileUpload = (file: File) =>
    handleFileUploadImpl(slideMutationDeps, file);

  // Handle image selection from the image selector dialog
  const handleImageSelect = (imageData: Blob, blobUrl: string) =>
    handleImageSelectImpl(slideMutationDeps, imageData, blobUrl);

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

  const handleDragEnd = (event: DragEndEvent) =>
    handleDragEndImpl(slideMutationDeps, event);

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
  const handleInsertMultipleSlides = (
    images: Array<{ imageData: Blob; blobUrl: string }>,
    insertAfterIndex: number,
  ) => handleInsertMultipleSlidesImpl(slideMutationDeps, images, insertAfterIndex);

  // Handle inserting a video slide (YouTube or Vimeo) at a specific position
  const handleInsertVideo = (videoUrl: string, insertAfterIndex: number) =>
    handleInsertVideoImpl(slideMutationDeps, videoUrl, insertAfterIndex);

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
      Math.min(currentSlideIndex, remainingSlides.length - 1),
    );
    setCurrentSlideIndex(newIndex);

    setShowDeleteDialog(false);
  };

  // Actual save function (called after confirmation)
  // Body moved to ./topic-detail/perform-save; deps are rebuilt each render
  // so the values are as fresh as the original closure captured.
  const performSave = () =>
    performSaveImpl({
      topic,
      stage,
      isSaving,
      isCertification,
      localSlides,
      originalSlides,
      deletedSlideIds,
      pendingFileUploads,
      setIsSaving,
      setUploadError,
      setSaveProgress,
      setSaveStatus,
      setTopic,
      setLocalSlides,
      setOriginalSlides,
      setPendingFileUploads,
      setDeletedSlideIds,
      setHasUnsavedChanges,
      setSlideRefreshKey,
      setShowSaveSuccess,
      setPendingSave,
      setShowSaveProgressDialog,
      invalidateSlide,
      invalidateCertificationSlide,
      fetchTopicData,
      refetchTopics,
    });

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
    const validation = validateNewSlides({
      localSlides,
      deletedSlideIds,
      pendingFileUploads,
      isCertification,
    });
    if (!validation.isValid) {
      console.log("Validation failed, showing validation dialog");
      setShowValidationDialog(true);
      return;
    }

    // Step 2: Calculate and show changes
    const changes = calculateChanges({
      originalSlides,
      localSlides,
      deletedSlideIds,
    });
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
        "Flag says changes but calculateChanges found none, saving directly",
      );
      performSave();
      return;
    }

    // Step 3: Show changes confirmation dialog
    console.log(
      "Setting showChangesDialog to true, changes count:",
      changes.length,
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

  // ── Lesson Plan list (upload/download/delete handlers live in LessonPlansDialog) ──
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

  // Show skeleton loaders while loading
  if (isLoading) {
    return <TopicDetailSkeleton />;
  }

  if (error) {
    return (
      <TopicDetailError
        error={error}
        onBack={() => router.push(`/admin/content/curriculum/${stageSlug}`)}
      />
    );
  }

  if (!topic) {
    return (
      <TopicDetailNotFound
        onBack={() => router.push(`/admin/content/curriculum/${stageSlug}`)}
      />
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
      <TopicHeader
        topic={topic}
        stage={stage}
        isCertification={isCertification}
        lessonPlans={lessonPlans}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        showSaveSuccess={showSaveSuccess}
        setIsEditTopicDrawerOpen={setIsEditTopicDrawerOpen}
        setIsEditCurriculumTopicDrawerOpen={setIsEditCurriculumTopicDrawerOpen}
        setShowLessonPlanDialog={setShowLessonPlanDialog}
        handleBulkSave={handleBulkSave}
      />

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
            <SlidePreview
              currentSlide={currentSlide}
              slideRefreshKey={slideRefreshKey}
              isCertification={isCertification}
            />

            {/* Slide Information Panel - 2/5 width */}
            <SlideInfoPanel
              slides={slides}
              currentSlide={currentSlide}
              currentSlideIndex={currentSlideIndex}
              isCertification={isCertification}
              isImageOrVideo={isImageOrVideo}
              isDeletingSlide={isDeletingSlide}
              isUploading={isUploading}
              isDragging={isDragging}
              imageUrlValue={imageUrlValue}
              videoUrlValue={videoUrlValue}
              uploadError={uploadError}
              uploadButtonRef={uploadButtonRef}
              setShowDeleteDialog={setShowDeleteDialog}
              setShowImageSelectorDialog={setShowImageSelectorDialog}
              handleTypeChange={handleTypeChange}
              handleVideoUrlChange={handleVideoUrlChange}
              handleDragOver={handleDragOver}
              handleDragLeave={handleDragLeave}
              handleDrop={handleDrop}
            />
          </div>

          {/* Second Row: Slide Gallery with Navigation */}
          <SlideGallery
            slides={slides}
            currentSlideIndex={currentSlideIndex}
            setCurrentSlideIndex={setCurrentSlideIndex}
            activeSlideId={activeSlideId}
            slideRefreshKey={slideRefreshKey}
            isReordering={isReordering}
            isCreatingSlide={isCreatingSlide}
            isCertification={isCertification}
            hoveredSlideIndex={hoveredSlideIndex}
            setHoveredSlideIndex={setHoveredSlideIndex}
            showAddButton={showAddButton}
            setShowAddButton={setShowAddButton}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            goToPrevious={goToPrevious}
            goToNext={goToNext}
            sensors={sensors}
            handleDragStart={handleDragStart}
            handleDragEnd={handleDragEnd}
            handleDragCancel={handleDragCancel}
            handleCreateSlide={handleCreateSlide}
            setGalleryRef={setGalleryRef}
          />
        </div>
      ) : null}

      {/* Delete Slide Confirmation Dialog */}
      <DeleteSlideDialog
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        isDeletingSlide={isDeletingSlide}
        handleDeleteSlide={handleDeleteSlide}
        setBulkDeleteSelectedIds={setBulkDeleteSelectedIds}
        setShowBulkDeleteDialog={setShowBulkDeleteDialog}
      />

      {/* Bulk Delete Slides Dialog */}
      <BulkDeleteDialog
        showBulkDeleteDialog={showBulkDeleteDialog}
        setShowBulkDeleteDialog={setShowBulkDeleteDialog}
        bulkDeleteSelectedIds={bulkDeleteSelectedIds}
        setBulkDeleteSelectedIds={setBulkDeleteSelectedIds}
        localSlides={localSlides}
        deletedSlideIds={deletedSlideIds}
        setDeletedSlideIds={setDeletedSlideIds}
        setHasUnsavedChanges={setHasUnsavedChanges}
        currentSlide={currentSlide}
        currentSlideIndex={currentSlideIndex}
        setCurrentSlideIndex={setCurrentSlideIndex}
        isCertification={isCertification}
      />

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        showUnsavedChangesDialog={showUnsavedChangesDialog}
        setShowUnsavedChangesDialog={setShowUnsavedChangesDialog}
        handleCancelNavigation={handleCancelNavigation}
        handleConfirmNavigation={handleConfirmNavigation}
      />

      {/* Validation Dialog - Missing Image/Video */}
      <ValidationDialog
        showValidationDialog={showValidationDialog}
        setShowValidationDialog={setShowValidationDialog}
      />

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
      <SaveProgressDialog
        showSaveProgressDialog={showSaveProgressDialog}
        setShowSaveProgressDialog={setShowSaveProgressDialog}
        isSaving={isSaving}
        saveStatus={saveStatus}
        saveProgress={saveProgress}
      />

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
      <LessonPlansDialog
        showLessonPlanDialog={showLessonPlanDialog}
        setShowLessonPlanDialog={setShowLessonPlanDialog}
        topic={topic}
        lessonPlans={lessonPlans}
        isLoadingLessonPlans={isLoadingLessonPlans}
        fetchLessonPlans={fetchLessonPlans}
      />

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
              invalidateAfterMutation(`/stages/${cachedStage.id}`, {
                id: cachedStage.id,
              });
            }

            // Trigger background refetch (non-blocking)
            refetchTopics();
            refetchStage();
          }}
          onTopicDeleted={async () => {
            // Invalidate React Query cache
            if (cachedStage.id) {
              invalidateAfterMutation(`/stages/${cachedStage.id}`, {
                id: cachedStage.id,
              });
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
