"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";
import { topicsApi } from "@/entities/topics/api/endpoints";
import type { topics, topicSlides } from "@/server/db/schema";
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
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs";
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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@workspace/ui/components/tooltip";
import { uploadSlideImage } from "@/utils/supabase/upload";
import { useTopicSlidesCacheStore } from "@/stores/topic-slides-cache-store";

type Topic = typeof topics.$inferSelect & {
  stage?: any;
  slides?: Array<typeof topicSlides.$inferSelect>;
};

interface TopicDetailSectionProps {
  stageSlug: string;
  topicSlug: string;
}

export function TopicDetailSection({
  stageSlug,
  topicSlug,
}: TopicDetailSectionProps) {
  const router = useRouter();
  const [stage, setStage] = useState<any | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const slideGalleryRef = useRef<HTMLDivElement>(null);
  const [showTypeChangeDialog, setShowTypeChangeDialog] = useState(false);
  const [pendingTypeChange, setPendingTypeChange] = useState<
    "image" | "video" | null
  >(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrlValue, setImageUrlValue] = useState<string>("");
  const [videoUrlValue, setVideoUrlValue] = useState<string>("");
  const urlUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const [slideRefreshKey, setSlideRefreshKey] = useState(0);
  const [draggedSlideId, setDraggedSlideId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);
  const [hoveredSlideIndex, setHoveredSlideIndex] = useState<number | null>(
    null
  );
  const [showAddButton, setShowAddButton] = useState<number | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isCreatingSlide, setIsCreatingSlide] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeletingSlide, setIsDeletingSlide] = useState(false);

  // Local state for slides (working copy)
  const [localSlides, setLocalSlides] = useState<SlideData[]>([]);
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
  const [originalSlides, setOriginalSlides] = useState<SlideData[]>([]);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [showChangesDialog, setShowChangesDialog] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);

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

  // Cache store methods
  const invalidateSlide = useTopicSlidesCacheStore(
    (state) => state.invalidateSlide
  );
  const getSlideUrl = useTopicSlidesCacheStore((state) => state.getSlideUrl);
  const setSlideUrl = useTopicSlidesCacheStore((state) => state.setSlideUrl);

  // Parse topic slug (e.g., "T1" -> order 1)
  const topicOrder = topicSlug.startsWith("T")
    ? parseInt(topicSlug.substring(1), 10)
    : null;

  useEffect(() => {
    if (!stageSlug || !topicOrder) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch stage
        const stageResult = await curriculumApi.stages.byCode(stageSlug);
        if (!stageResult.data) {
          setError(
            stageResult.error?.message ?? "Failed to fetch curriculum stage"
          );
          return;
        }
        setStage(stageResult.data);

        // Fetch topics for this stage
        const topicsResult = await topicsApi.get.list({
          stageId: stageResult.data.id,
        });
        if (!topicsResult.data) {
          setError(topicsResult.error?.message ?? "Failed to fetch topics");
          return;
        }

        // Find topic by stageOrder
        // URL format is T1, T2, etc., so we match stageOrder exactly
        // (stageOrder is typically 1-indexed based on display)
        const foundTopic = topicsResult.data.find(
          (t) => t.stageOrder === topicOrder
        );

        if (!foundTopic) {
          setError(`Topic with order ${topicOrder} not found`);
          return;
        }

        // Fetch full topic details with slides
        const topicResult = await topicsApi.get.byId(foundTopic.id);
        if (topicResult.data) {
          setTopic(topicResult.data);
          // Initialize local slides state
          const initialSlides =
            topicResult.data.slides
              ?.sort((a, b) => a.orderIndex - b.orderIndex)
              .map((slide) => ({
                id: slide.id,
                kind: slide.kind as "text" | "image" | "video",
                orderIndex: slide.orderIndex,
                textHtml: slide.textHtml ?? null,
                imageUrl: slide.imageUrl ?? null,
                videoUrl: slide.videoUrl ?? null,
                videoStartS: slide.videoStartS ?? null,
                videoEndS: slide.videoEndS ?? null,
                effectiveNotes: slide.officialNotes ?? null,
              })) ?? [];
          setLocalSlides(initialSlides);
          setOriginalSlides(JSON.parse(JSON.stringify(initialSlides))); // Deep copy for comparison
          setHasUnsavedChanges(false);
          setDeletedSlideIds(new Set());
          setPendingFileUploads(new Map());
        } else {
          setError(
            topicResult.error?.message ?? "Failed to fetch topic details"
          );
        }
      } catch (err) {
        console.error("Failed to fetch topic:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch topic details"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [stageSlug, topicOrder]);

  // Use local slides instead of topic.slides
  const slides = localSlides.filter((s) => !deletedSlideIds.has(s.id));
  const currentSlide = slides[currentSlideIndex];
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

  const handleTypeChange = (newType: string) => {
    if (
      newType !== currentSlide?.kind &&
      (newType === "image" || newType === "video")
    ) {
      setPendingTypeChange(newType as "image" | "video");
      setShowTypeChangeDialog(true);
    }
  };

  const handleConfirmTypeChange = () => {
    if (!currentSlide || !pendingTypeChange) return;

    // Update local slide state
    const updatedSlides = localSlides.map((slide) => {
      if (slide.id !== currentSlide.id) return slide;

      if (pendingTypeChange === "image") {
        return {
          ...slide,
          kind: "image" as const,
          imageUrl: imageUrlValue || slide.imageUrl || null,
          videoUrl: null,
          textHtml: null,
        };
      } else {
        // video
        const videoUrl = videoUrlValue || slide.videoUrl || null;
        if (!videoUrl) {
          setUploadError("Video URL is required when changing to video type");
          return slide;
        }
        return {
          ...slide,
          kind: "video" as const,
          videoUrl,
          imageUrl: null,
          textHtml: null,
        };
      }
    });

    setLocalSlides(updatedSlides);
    setHasUnsavedChanges(true);
    setShowTypeChangeDialog(false);
    setPendingTypeChange(null);
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

  const handleFileUpload = (file: File) => {
    if (!file || !currentSlide) return;

    // Validate file type
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

        // Refresh topic data
        if (topic) {
          const topicResult = await topicsApi.get.byId(topic.id);
          if (topicResult.data) {
            setTopic(topicResult.data);
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

  // Handle slide reordering via drag and drop
  const handleSlideDragStart = (slideId: string, index: number) => {
    setDraggedSlideId(slideId);
    setDragOverIndex(null);
    setInsertAfterIndex(null);
  };

  const handleSlideDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedSlideId === null) return;

    const draggedIndex = slides.findIndex((s) => s.id === draggedSlideId);
    if (draggedIndex === index) {
      setDragOverIndex(null);
      setInsertAfterIndex(null);
      return;
    }

    // Determine if we're closer to the left or right edge of the slide
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX;
    const slideWidth = rect.width;
    const slideLeft = rect.left;
    const slideRight = rect.right;

    // Use a threshold (e.g., 30% of slide width) to determine insertion point
    const threshold = slideWidth * 0.3;
    const distanceFromLeft = mouseX - slideLeft;
    const distanceFromRight = slideRight - mouseX;

    if (distanceFromLeft < threshold) {
      // Closer to left edge: insert before this slide (after the previous slide)
      const targetAfterIndex = index - 1;
      // Don't show if dragging to the same position
      if (
        draggedIndex !== targetAfterIndex &&
        draggedIndex !== targetAfterIndex + 1
      ) {
        setInsertAfterIndex(targetAfterIndex);
        setDragOverIndex(null);
      }
    } else if (distanceFromRight < threshold) {
      // Closer to right edge: insert after this slide
      const targetAfterIndex = index;
      // Don't show if dragging to the same position
      if (
        draggedIndex !== targetAfterIndex &&
        draggedIndex !== targetAfterIndex + 1
      ) {
        setInsertAfterIndex(targetAfterIndex);
        setDragOverIndex(null);
      }
    } else {
      // In the middle: don't show insert indicator, just highlight the slide
      setDragOverIndex(index);
      setInsertAfterIndex(null);
    }
  };

  const handleDropZoneDragOver = (e: React.DragEvent, afterIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedSlideId === null) return;

    const draggedIndex = slides.findIndex((s) => s.id === draggedSlideId);
    // Don't show insert indicator if dragging to the same position
    if (draggedIndex === afterIndex || draggedIndex === afterIndex + 1) {
      setInsertAfterIndex(null);
      return;
    }

    setInsertAfterIndex(afterIndex);
    setDragOverIndex(null);
  };

  const handleSlideDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if we're actually leaving the gallery area
    const relatedTarget = e.relatedTarget as Node | null;
    if (
      !slideGalleryRef.current?.contains(relatedTarget) &&
      !(
        relatedTarget instanceof Element &&
        relatedTarget.closest("[data-drop-zone]")
      )
    ) {
      setDragOverIndex(null);
      setInsertAfterIndex(null);
    }
  };

  const handleSlideDrop = async (e: React.DragEvent, dropIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedSlideId || !topic) return;

    const draggedIndex = slides.findIndex((s) => s.id === draggedSlideId);
    if (draggedIndex === -1) {
      setDraggedSlideId(null);
      setDragOverIndex(null);
      setInsertAfterIndex(null);
      return;
    }

    // Determine the target index based on insertAfterIndex or dropIndex
    let targetIndex: number;
    if (insertAfterIndex !== null) {
      // insertAfterIndex represents the index of the slide we want to insert after
      // Special case: insertAfterIndex = -1 means insert before first slide (at position 0)
      if (insertAfterIndex === -1) {
        targetIndex = 0;
      } else {
        // We want to insert at position insertAfterIndex + 1
        targetIndex = insertAfterIndex + 1;

        // However, if we're dragging forward (draggedIndex < insertAfterIndex),
        // we need to account for the fact that removing the dragged slide first
        // will shift all subsequent slides left by 1
        if (draggedIndex < insertAfterIndex) {
          // After removing draggedIndex, the slide at insertAfterIndex becomes insertAfterIndex - 1
          // So we want to insert at insertAfterIndex (which is insertAfterIndex - 1 + 1)
          targetIndex = insertAfterIndex;
        }
      }
    } else if (dropIndex !== undefined) {
      targetIndex = dropIndex;
    } else {
      // Fallback: no valid drop target
      setDraggedSlideId(null);
      setDragOverIndex(null);
      setInsertAfterIndex(null);
      return;
    }

    // Ensure targetIndex is valid (non-negative and within bounds)
    if (targetIndex < 0) {
      targetIndex = 0;
    }
    if (targetIndex > slides.length) {
      targetIndex = slides.length;
    }

    // Don't do anything if we're dropping at the same position
    if (draggedIndex === targetIndex) {
      setDraggedSlideId(null);
      setDragOverIndex(null);
      setInsertAfterIndex(null);
      return;
    }

    setIsReordering(true);
    setDragOverIndex(null);
    setInsertAfterIndex(null);

    try {
      // Create a new array with the reordered slides (local state only)
      const newSlides = [...slides];
      const [draggedSlide] = newSlides.splice(draggedIndex, 1);
      newSlides.splice(targetIndex, 0, draggedSlide);

      // Update orderIndex for all slides
      const reorderedSlides = newSlides.map((slide, index) => ({
        ...slide,
        orderIndex: index,
      }));

      setLocalSlides(reorderedSlides);
      setHasUnsavedChanges(true);

      // Update current slide index to track the dragged slide
      const newDraggedIndex = reorderedSlides.findIndex(
        (s) => s.id === draggedSlideId
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
      setDraggedSlideId(null);
      setDragOverIndex(null);
    }
  };

  const handleSlideDragEnd = () => {
    setDraggedSlideId(null);
    setDragOverIndex(null);
    setInsertAfterIndex(null);
  };

  // Handle creating a new slide at a specific position (local state only)
  const handleCreateSlide = (insertAfterIndex: number) => {
    if (!topic) return;

    // Generate temporary ID for new slide
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create new slide in local state
    const newSlide: SlideData = {
      id: tempId,
      kind: "image",
      orderIndex: insertAfterIndex + 1, // Will be reordered below
      textHtml: null,
      imageUrl: null,
      videoUrl: null,
      videoStartS: null,
      videoEndS: null,
      effectiveNotes: null,
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

  // Validate that all new slides have images or videos
  const validateNewSlides = (): { isValid: boolean; message?: string } => {
    const newSlides = localSlides.filter(
      (s) => s.id.startsWith("temp_") && !deletedSlideIds.has(s.id)
    );

    for (const slide of newSlides) {
      const hasFileUpload = pendingFileUploads.has(slide.id);
      const hasImageUrl = !!slide.imageUrl;
      const hasVideoUrl = !!slide.videoUrl;

      if (!hasFileUpload && !hasImageUrl && !hasVideoUrl) {
        return {
          isValid: false,
          message:
            "You have a slide that does not have an image. Please provide an image before saving changes.",
        };
      }
    }

    return { isValid: true };
  };

  // Calculate differences between original and current slides
  const calculateChanges = (): string[] => {
    const changes: string[] = [];

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
        changes.push(`Slide ${originalIdx + 1} deleted`);
      }
    }

    // Find new slides (temp IDs) and determine their insertion points
    const newSlides = currentSorted.filter((s) => s.id.startsWith("temp_"));

    // Build a map of final positions for existing slides (non-temp)
    const existingSlidesInFinalOrder = currentSorted.filter(
      (s) => !s.id.startsWith("temp_")
    );

    for (const newSlide of newSlides) {
      const newSlideIndex = currentSorted.findIndex(
        (s) => s.id === newSlide.id
      );

      // Find the existing slide before this new slide
      const beforeExisting = existingSlidesInFinalOrder
        .filter((s) => {
          const idx = currentSorted.findIndex((slide) => slide.id === s.id);
          return idx < newSlideIndex;
        })
        .pop();

      // Find the existing slide after this new slide
      const afterExisting = existingSlidesInFinalOrder.find((s) => {
        const idx = currentSorted.findIndex((slide) => slide.id === s.id);
        return idx > newSlideIndex;
      });

      if (beforeExisting && afterExisting) {
        // Find the original positions of these slides
        const beforeOriginalIdx = originalSorted.findIndex(
          (s) => s.id === beforeExisting.id
        );
        const afterOriginalIdx = originalSorted.findIndex(
          (s) => s.id === afterExisting.id
        );

        if (beforeOriginalIdx >= 0 && afterOriginalIdx >= 0) {
          changes.push(
            `New slide inserted between slide ${beforeOriginalIdx + 1} and slide ${afterOriginalIdx + 1}`
          );
        } else {
          changes.push("New slide inserted");
        }
      } else if (beforeExisting) {
        const beforeOriginalIdx = originalSorted.findIndex(
          (s) => s.id === beforeExisting.id
        );
        if (beforeOriginalIdx >= 0) {
          changes.push(
            `New slide inserted after slide ${beforeOriginalIdx + 1}`
          );
        } else {
          changes.push("New slide inserted at the end");
        }
      } else if (afterExisting) {
        const afterOriginalIdx = originalSorted.findIndex(
          (s) => s.id === afterExisting.id
        );
        if (afterOriginalIdx >= 0) {
          changes.push(
            `New slide inserted before slide ${afterOriginalIdx + 1}`
          );
        } else {
          changes.push("New slide inserted at the beginning");
        }
      } else {
        changes.push("New slide inserted");
      }
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
        changes.push("Slides reordered");
      }
    }

    return changes;
  };

  // Actual save function (called after confirmation)
  const performSave = async () => {
    if (!topic || !stage || isSaving) return;

    setIsSaving(true);
    setUploadError(null);

    try {
      // Extract stage number from stage.code (e.g., "S1" -> 1)
      const stageNumberMatch = stage.code.match(/^S(\d+)$/);
      if (!stageNumberMatch) {
        throw new Error("Invalid stage code format");
      }
      const stageNumber = parseInt(stageNumberMatch[1], 10);
      const topicNumber = topic.stageOrder;
      if (topicNumber === null || topicNumber === undefined) {
        throw new Error("Topic stageOrder is missing");
      }

      // Step 1: Prepare operations
      const activeSlides = localSlides.filter(
        (s) => !deletedSlideIds.has(s.id)
      );
      const sortedSlides = [...activeSlides].sort(
        (a, b) => a.orderIndex - b.orderIndex
      );

      // Separate slides into creates and updates
      const creates: any[] = [];
      const updates: any[] = [];
      const slideIds: string[] = [];

      for (const slide of sortedSlides) {
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
          deletes: Array.from(deletedSlideIds),
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

      // Step 3: Call bulk save API with FormData
      const result = await topicsApi.slides.bulkSave(formData);

      if (result.error) {
        throw new Error(result.error.message || "Failed to save changes");
      }

      // Step 4: Update local state with server response
      if (result.data && "topic" in result.data && result.data.topic) {
        setTopic(result.data.topic);
        const updatedSlides =
          result.data.topic.slides
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
            })) ?? [];
        setLocalSlides(updatedSlides);

        // Invalidate cache for slides that had files uploaded
        // For existing slides with file uploads
        for (const slideId of Array.from(pendingFileUploads.keys())) {
          if (!slideId.startsWith("temp_")) {
            invalidateSlide(slideId);
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
              invalidateSlide(createdSlide.id);
            }
          }
        }

        // Clear pending changes
        setPendingFileUploads(new Map());
        setDeletedSlideIds(new Set());
        setHasUnsavedChanges(false);
        setSlideRefreshKey((prev) => prev + 1);

        // Update original slides to match current state
        setOriginalSlides(JSON.parse(JSON.stringify(updatedSlides)));

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
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save changes";
      setUploadError(errorMessage);
      toast.error(errorMessage, {
        position: "bottom-right",
      });
    } finally {
      setIsSaving(false);
      setPendingSave(false);
      setShowChangesDialog(false);
    }
  };

  // Handle save button click - validate first, then show confirmation
  const handleBulkSave = () => {
    if (!topic || !stage || isSaving || !hasUnsavedChanges) return;

    // Step 1: Validate new slides
    const validation = validateNewSlides();
    if (!validation.isValid) {
      setShowValidationDialog(true);
      return;
    }

    // Step 2: Calculate and show changes
    const changes = calculateChanges();
    if (changes.length === 0) {
      // No changes to show, save directly
      performSave();
      return;
    }

    // Step 3: Show changes confirmation dialog
    setShowChangesDialog(true);
    setPendingSave(true);
  };

  // Handle confirmation of changes
  const handleConfirmChanges = () => {
    setShowChangesDialog(false);
    performSave();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading topic...</p>
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
            <h1 className="text-3xl font-bold tracking-tight">{topic.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {stage && <Badge variant="secondary">{stage.name}</Badge>}
            {topic.stageOrder !== null && (
              <Badge variant="outline">Topic {topic.stageOrder}</Badge>
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
          <Button variant="outline">Preview</Button>
          <Button
            variant={
              showSaveSuccess
                ? "default"
                : hasUnsavedChanges
                  ? "default"
                  : "outline"
            }
            onClick={handleBulkSave}
            disabled={isSaving || (!hasUnsavedChanges && !showSaveSuccess)}
            className={
              showSaveSuccess
                ? "bg-green-500 hover:bg-green-600 text-white"
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
              "Save Changes"
            )}
          </Button>
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
            </div>
          </CardContent>
        </Card>
      ) : currentSlide ? (
        <div className="space-y-8">
          {/* First Row: Current Slide Preview (3/5) + Slide Info (2/5) */}
          <div className="grid grid-cols-5 gap-6">
            {/* Current Slide Preview - 3/5 width */}
            <div className="col-span-3">
              <div className="relative w-full aspect-video rounded-lg shadow-lg overflow-hidden bg-background">
                <SlideRenderer
                  key={`${currentSlide.id}-${slideRefreshKey}`}
                  slide={currentSlide}
                  className="w-full h-full"
                />
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
                                ) : (
                                  <VideoIcon className="h-4 w-4" />
                                )}
                                <span className="capitalize">
                                  {currentSlide.kind}
                                </span>
                              </div>
                            </SelectTrigger>
                            <SelectContent>
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

                    {/* Upload Button - fills remaining space */}
                    {currentSlide.kind === "image" && (
                      <div className="flex-1 flex items-end mt-auto pt-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <Button
                          ref={uploadButtonRef}
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
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
                              <Upload className="h-6 w-6" />
                              <span>Click to upload or drag and drop</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    {currentSlide.kind === "video" && (
                      <div className="space-y-2">
                        <Label htmlFor="video-url">Video URL</Label>
                        <Input
                          id="video-url"
                          value={videoUrlValue}
                          onChange={(e) => handleVideoUrlChange(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          disabled={isUploading}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label htmlFor="video-start">Start Time (s)</Label>
                            <Input
                              id="video-start"
                              type="number"
                              value={currentSlide.videoStartS ?? ""}
                              placeholder="0"
                              readOnly
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="video-end">End Time (s)</Label>
                            <Input
                              id="video-end"
                              type="number"
                              value={currentSlide.videoEndS ?? ""}
                              placeholder="0"
                              readOnly
                            />
                          </div>
                        </div>
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
              <div
                ref={slideGalleryRef}
                className="flex gap-4 overflow-x-auto overflow-y-visible py-3 px-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent relative"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragLeave={handleSlideDragLeave}
                onWheel={(e) => {
                  // Convert vertical scroll to horizontal scroll
                  if (slideGalleryRef.current) {
                    e.preventDefault();
                    slideGalleryRef.current.scrollLeft += e.deltaY;
                  }
                }}
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
                  const isDragging = draggedSlideId === slide.id;
                  const showInsertBefore = insertAfterIndex === index - 1;
                  const showInsertAfter = insertAfterIndex === index;

                  // Show add button on the right side after 1 second of hovering
                  const showAddButtonForSlide =
                    showAddButton === index && !draggedSlideId && !isReordering;

                  return (
                    <div key={slide.id} className="flex items-center relative">
                      {/* Drop zone before slide (for drag and drop) */}
                      <div
                        data-drop-zone
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isReordering && draggedSlideId) {
                            handleDropZoneDragOver(e, index - 1);
                          }
                        }}
                        onDrop={(e) => {
                          if (!isReordering && draggedSlideId) {
                            handleSlideDrop(e);
                          }
                        }}
                        onDragLeave={(e) => {
                          // Only clear if leaving the drop zone entirely
                          const relatedTarget = e.relatedTarget as Node | null;
                          if (
                            !(
                              relatedTarget instanceof Element &&
                              (relatedTarget.closest("[data-drop-zone]") ||
                                relatedTarget.closest("button"))
                            )
                          ) {
                            if (showInsertBefore) {
                              setInsertAfterIndex(null);
                            }
                          }
                        }}
                        className={`
                          flex-shrink-0 transition-all duration-200 ease-out
                          ${showInsertBefore ? "w-[180px] mr-6" : "w-0"}
                          ${showInsertBefore ? "opacity-100" : "opacity-0"}
                          ${draggedSlideId && !isReordering ? "cursor-move" : ""}
                        `}
                        style={{
                          aspectRatio: showInsertBefore ? "16 / 9" : "unset",
                          minHeight: showInsertBefore ? "unset" : "100%",
                        }}
                      >
                        {showInsertBefore && (
                          <div className="w-full h-full border-2 border-dashed border-primary bg-primary/10 rounded-lg flex flex-col items-center justify-center gap-2 shadow-lg">
                            <div className="text-sm font-semibold text-primary">
                              Drop here
                            </div>
                            <div className="text-xs text-primary/70">
                              Insert slide
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Slide button */}
                      <button
                        draggable={!isReordering}
                        onDragStart={(e) => {
                          if (!isReordering) {
                            handleSlideDragStart(slide.id, index);
                            e.dataTransfer.effectAllowed = "move";
                          }
                        }}
                        onDragOver={(e) => {
                          if (!isReordering && draggedSlideId) {
                            handleSlideDragOver(e, index);
                          }
                        }}
                        onDragLeave={handleSlideDragLeave}
                        onDrop={(e) => {
                          if (!isReordering && draggedSlideId) {
                            handleSlideDrop(e, index);
                          }
                        }}
                        onDragEnd={handleSlideDragEnd}
                        onClick={() => {
                          if (!isReordering) {
                            setCurrentSlideIndex(index);
                          }
                        }}
                        onMouseEnter={() => {
                          if (!draggedSlideId && !isReordering) {
                            setHoveredSlideIndex(index);
                            // Clear any existing timeout
                            if (hoverTimeoutRef.current) {
                              clearTimeout(hoverTimeoutRef.current);
                            }
                            // Set timeout to show button after 300ms
                            hoverTimeoutRef.current = setTimeout(() => {
                              setShowAddButton(index);
                            }, 300);
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredSlideIndex(null);
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
                        }}
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
                        <div className="w-full h-full">
                          <SlideRenderer
                            key={`${slide.id}-${slideRefreshKey}`}
                            slide={slide}
                            className="w-full h-full"
                            thumbnailOnly={true}
                          />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 text-center text-xs font-medium py-1 px-2 bg-background/80 text-foreground">
                          Slide {slide.orderIndex + 1}
                        </div>
                      </button>

                      {/* Add slide button - appears centered between slides after 300ms hover */}
                      {index < slides.length - 1 && (
                        <div
                          className="flex-shrink-0 flex items-center justify-center transition-all duration-200"
                          style={{
                            width: showAddButtonForSlide ? "48px" : "0px",
                            opacity: showAddButtonForSlide ? 1 : 0,
                            // transform: showAddButtonForSlide
                            //   ? "padding-left(16px)"
                            //   : "padding-left(0)",
                          }}
                          onMouseEnter={() => {
                            // Cancel any pending hide timeout
                            if (hideButtonTimeoutRef.current) {
                              clearTimeout(hideButtonTimeoutRef.current);
                              hideButtonTimeoutRef.current = null;
                            }
                            // Keep button visible when hovering over it
                            setShowAddButton(index);
                          }}
                          onMouseLeave={() => {
                            // Hide button after a short delay
                            if (hideButtonTimeoutRef.current) {
                              clearTimeout(hideButtonTimeoutRef.current);
                            }
                            hideButtonTimeoutRef.current = setTimeout(() => {
                              setShowAddButton(null);
                            }, 200);
                          }}
                        >
                          {showAddButtonForSlide && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCreateSlide(index);
                                  }}
                                  disabled={isCreatingSlide}
                                  className="h-10 w-12 rounded-lg bg-background/50 border-2 border-dashed border-muted-foreground/40 shadow-sm flex items-center justify-center hover:bg-background/80 hover:border-muted-foreground/60 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait ml-4"
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
                      )}

                      {/* Drop zone after slide (only show after last slide for drag and drop) */}
                      {index === slides.length - 1 && (
                        <div
                          data-drop-zone
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isReordering && draggedSlideId) {
                              handleDropZoneDragOver(e, index);
                            }
                          }}
                          onDrop={(e) => {
                            if (!isReordering && draggedSlideId) {
                              handleSlideDrop(e);
                            }
                          }}
                          onDragLeave={(e) => {
                            // Only clear if leaving the drop zone entirely
                            const relatedTarget =
                              e.relatedTarget as Node | null;
                            if (
                              !(
                                relatedTarget instanceof Element &&
                                (relatedTarget.closest("[data-drop-zone]") ||
                                  relatedTarget.closest("button"))
                              )
                            ) {
                              if (showInsertAfter) {
                                setInsertAfterIndex(null);
                              }
                            }
                          }}
                          className={`
                            flex-shrink-0 transition-all duration-200 ease-out
                            ${showInsertAfter ? "w-[180px] ml-6" : "w-0"}
                            ${showInsertAfter ? "opacity-100" : "opacity-0"}
                            ${draggedSlideId && !isReordering ? "cursor-move" : ""}
                          `}
                          style={{
                            aspectRatio: showInsertAfter ? "16 / 9" : "unset",
                            minHeight: showInsertAfter ? "unset" : "100%",
                          }}
                        >
                          {showInsertAfter && (
                            <div className="w-full h-full border-2 border-dashed border-primary bg-primary/10 rounded-lg flex flex-col items-center justify-center gap-2 shadow-lg">
                              <div className="text-sm font-semibold text-primary">
                                Drop here
                              </div>
                              <div className="text-xs text-primary/70">
                                Insert slide
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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

      {/* Type Change Confirmation Dialog */}
      <Dialog
        open={showTypeChangeDialog}
        onOpenChange={setShowTypeChangeDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Slide Type</DialogTitle>
            <DialogDescription>
              This will convert the current slide to a{" "}
              {pendingTypeChange === "video" ? "video" : "image"}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTypeChangeDialog(false);
                setPendingTypeChange(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmTypeChange}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      <Dialog open={showChangesDialog} onOpenChange={setShowChangesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Changes</DialogTitle>
            <DialogDescription>
              The following changes will be saved:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ul className="space-y-2 list-disc list-inside text-sm">
              {calculateChanges().map((change, index) => (
                <li key={index} className="text-muted-foreground">
                  {change}
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowChangesDialog(false);
                setPendingSave(false);
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmChanges} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "OK"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
