import { toast } from "sonner";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import { computePositionsForOrder } from "@/lib/fractional-position";

import type { CertificationTopic, ExtendedSlideData, Topic } from "./types";

// Shared dependencies for the slide-mutation handlers below. The orchestrator
// keeps thin wrappers with the original handler names; only the bodies moved here.
export interface SlideMutationDeps {
  topic: Topic | CertificationTopic | null;
  isCertification: boolean;
  slides: ExtendedSlideData[];
  currentSlide: ExtendedSlideData | undefined;
  localSlides: ExtendedSlideData[];
  pendingFileUploads: Map<string, File>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setLocalSlides: React.Dispatch<React.SetStateAction<ExtendedSlideData[]>>;
  setPendingFileUploads: React.Dispatch<
    React.SetStateAction<Map<string, File>>
  >;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  setImageUrlValue: React.Dispatch<React.SetStateAction<string>>;
  setVideoUrlValue: React.Dispatch<React.SetStateAction<string>>;
  setUploadError: React.Dispatch<React.SetStateAction<string | null>>;
  setSlideRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  setCurrentSlideIndex: React.Dispatch<React.SetStateAction<number>>;
  setHoveredSlideIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setActiveSlideId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsReordering: React.Dispatch<React.SetStateAction<boolean>>;
}

export const handleTypeChangeImpl = (
  deps: SlideMutationDeps,
  newType: string,
) => {
  const {
    isCertification,
    currentSlide,
    localSlides,
    setLocalSlides,
    setHasUnsavedChanges,
    setImageUrlValue,
    setVideoUrlValue,
    setUploadError,
  } = deps;

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

export const handleFileUploadImpl = (deps: SlideMutationDeps, file: File) => {
  const {
    currentSlide,
    localSlides,
    pendingFileUploads,
    fileInputRef,
    setLocalSlides,
    setPendingFileUploads,
    setHasUnsavedChanges,
    setImageUrlValue,
    setUploadError,
    setSlideRefreshKey,
  } = deps;

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
    slide.id === currentSlide.id ? { ...slide, imageUrl: previewUrl } : slide,
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
export const handleImageSelectImpl = async (
  deps: SlideMutationDeps,
  imageData: Blob,
  blobUrl: string,
) => {
  const {
    currentSlide,
    localSlides,
    pendingFileUploads,
    setLocalSlides,
    setPendingFileUploads,
    setHasUnsavedChanges,
    setImageUrlValue,
    setUploadError,
    setSlideRefreshKey,
  } = deps;

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
      slide.id === currentSlide.id ? { ...slide, imageUrl: blobUrl } : slide,
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
        : "Failed to apply image. Please try again.",
    );
  }
};

export const handleDragEndImpl = (
  deps: SlideMutationDeps,
  event: DragEndEvent,
) => {
  const {
    topic,
    slides,
    setLocalSlides,
    setHasUnsavedChanges,
    setCurrentSlideIndex,
    setUploadError,
    setActiveSlideId,
    setIsReordering,
  } = deps;

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

    // Assign fractional positions for new order
    const reorderedIds = newSlides.map((s) => s.id);
    const positions = computePositionsForOrder(reorderedIds);
    const reorderedSlides = newSlides.map((slide, index) => ({
      ...slide,
      position: positions[index],
    }));

    setLocalSlides(reorderedSlides);
    setHasUnsavedChanges(true);

    // Update current slide index to track the dragged slide
    const newDraggedIndex = reorderedSlides.findIndex(
      (s) => s.id === active.id,
    );

    if (newDraggedIndex !== -1) {
      setCurrentSlideIndex(newDraggedIndex);
    }
  } catch (err) {
    console.error("Failed to reorder slides:", err);
    setUploadError(
      err instanceof Error ? err.message : "Failed to reorder slides",
    );
  } finally {
    setIsReordering(false);
    setActiveSlideId(null);
  }
};

// Handle inserting multiple slides at a specific position
export const handleInsertMultipleSlidesImpl = async (
  deps: SlideMutationDeps,
  images: Array<{ imageData: Blob; blobUrl: string }>,
  insertAfterIndex: number,
) => {
  const {
    topic,
    localSlides,
    pendingFileUploads,
    setLocalSlides,
    setPendingFileUploads,
    setHasUnsavedChanges,
    setCurrentSlideIndex,
    setHoveredSlideIndex,
    setSlideRefreshKey,
  } = deps;

  console.log("[topic-detail] handleInsertMultipleSlides called:", {
    imagesCount: images.length,
    insertAfterIndex,
    currentSlidesCount: localSlides.length,
  });

  if (!topic || images.length === 0) {
    console.warn(
      "[topic-detail] handleInsertMultipleSlides: No topic or images, returning early",
    );
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
      },
    );

    // Store file for bulk upload (add to the same Map)
    newPendingUploads.set(tempId, file);

    const slide = {
      id: tempId,
      kind: "image" as const,
      position: "a0", // Will be set below
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

  console.log(
    "[topic-detail] Created",
    newSlides.length,
    "new slides with content",
  );

  // Update pending uploads once with all files
  setPendingFileUploads(newPendingUploads);

  // Insert slides at correct position (after insertAfterIndex)
  const updatedSlides = [...localSlides];
  updatedSlides.splice(insertAfterIndex + 1, 0, ...newSlides);

  // Assign fractional positions for full list (orderIndex for API compatibility)
  const allIds = updatedSlides.map((s) => s.id);
  const positions = computePositionsForOrder(allIds);
  const reorderedSlides = updatedSlides.map((slide, index) => ({
    ...slide,
    position: positions[index],
  }));

  setLocalSlides(reorderedSlides);
  setHasUnsavedChanges(true);

  // Navigate to the first newly created slide
  const firstNewSlideIndex = reorderedSlides.findIndex(
    (s) => s.id === newSlides[0].id,
  );
  if (firstNewSlideIndex !== -1) {
    setCurrentSlideIndex(firstNewSlideIndex);
  }

  setHoveredSlideIndex(null);
  setSlideRefreshKey((prev) => prev + 1);
};

// Handle inserting a video slide (YouTube or Vimeo) at a specific position
export const handleInsertVideoImpl = (
  deps: SlideMutationDeps,
  videoUrl: string,
  insertAfterIndex: number,
) => {
  const {
    topic,
    localSlides,
    setLocalSlides,
    setHasUnsavedChanges,
    setCurrentSlideIndex,
    setHoveredSlideIndex,
    setSlideRefreshKey,
  } = deps;

  if (!topic) return;

  // Generate temporary ID for new slide
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create new video slide
  const newSlide: ExtendedSlideData = {
    id: tempId,
    kind: "video" as const,
    position: "a0", // Will be set below
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

  // Assign fractional positions for full list (orderIndex for API compatibility)
  const allIds = updatedSlides.map((s) => s.id);
  const positions = computePositionsForOrder(allIds);
  const reorderedSlides = updatedSlides.map((slide, index) => ({
    ...slide,
    position: positions[index],
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
