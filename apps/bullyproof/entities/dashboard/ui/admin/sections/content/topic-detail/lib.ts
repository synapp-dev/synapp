import type { SlideData } from "@/components/organisms/slide-renderer";
import { compareSlidesByPosition } from "@/lib/fractional-position";

import type { ExtendedSlideData, ChangeItem } from "./types";

// Helper function to check if a slide has content
export function slideHasContent(
  slide:
    | SlideData
    | {
        id: string;
        kind: string;
        imageUrl?: string | null;
        videoUrl?: string | null;
        textHtml?: string | null;
        quizData?: any;
        signedUrl?: string | null;
      },
  isCertification: boolean,
  pendingFileUploads?: Map<string, File>,
): boolean {
  // Check if imageUrl exists and is not just a placeholder/invalid URL
  // Blob URLs are temporary and valid (from file uploads)
  const imageUrl = slide.imageUrl;
  const signedUrl = (slide as any).signedUrl; // Signed URL from API - null if file doesn't exist

  // For image slides: require valid image content (blob, signedUrl, storage path, or pending upload).
  // imageUrl can be a storage path (e.g. "stages/s1/topics/.../slide-id.jpg") - count as content.
  // Empty image slides (no URL, broken URL, or missing file) are ghost slides - treat as having no content
  // so they can be filtered on load and marked for deletion.
  const isBlobUrl = imageUrl?.startsWith("blob:");
  const hasStoragePath =
    !!imageUrl && !imageUrl.startsWith("blob:") && imageUrl.trim() !== "";
  const hasValidImageUrl =
    isBlobUrl || hasStoragePath || (!!signedUrl && signedUrl.trim() !== "");
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

  const hasContent =
    hasValidImageUrl ||
    hasVideoUrl ||
    hasQuizData ||
    hasTextHtml ||
    hasPendingUpload;

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
      position: (slide as any).position,
    });
  }

  return hasContent;
}

// Validate that all new slides have images, videos, or quiz data
export const validateNewSlides = ({
  localSlides,
  deletedSlideIds,
  pendingFileUploads,
  isCertification,
}: {
  localSlides: ExtendedSlideData[];
  deletedSlideIds: Set<string>;
  pendingFileUploads: Map<string, File>;
  isCertification: boolean;
}): { isValid: boolean; message?: string } => {
  const newSlides = localSlides.filter(
    (s) => s.id.startsWith("temp_") && !deletedSlideIds.has(s.id),
  );

  for (const slide of newSlides) {
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

// Calculate differences between original and current slides
export const calculateChanges = ({
  originalSlides,
  localSlides,
  deletedSlideIds,
}: {
  originalSlides: ExtendedSlideData[];
  localSlides: ExtendedSlideData[];
  deletedSlideIds: Set<string>;
}): ChangeItem[] => {
  const changes: ChangeItem[] = [];

  // Get original slides sorted by position
  const originalSorted = [...originalSlides].sort(compareSlidesByPosition);

  // Get current slides sorted by position (excluding deleted)
  const currentSorted = localSlides
    .filter((s) => !deletedSlideIds.has(s.id))
    .sort(compareSlidesByPosition);

  // Find deleted slides (from original that are now deleted)
  const deletedSlides = originalSlides.filter((s) =>
    deletedSlideIds.has(s.id),
  );
  for (const deletedSlide of deletedSlides) {
    // Find original position (1-indexed) in the original sorted list
    const originalIdx = originalSorted.findIndex(
      (s) => s.id === deletedSlide.id,
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
    (s) => !s.id.startsWith("temp_"),
  );
  for (const currentSlide of existingSlides) {
    const originalSlide = originalSlides.find(
      (s) => s.id === currentSlide.id,
    );
    if (originalSlide) {
      // Check if image was replaced
      const imageReplaced =
        originalSlide.imageUrl !== currentSlide.imageUrl &&
        (originalSlide.imageUrl || currentSlide.imageUrl);
      if (imageReplaced) {
        const slideIndex = currentSorted.findIndex(
          (s) => s.id === currentSlide.id,
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
      (s) => s.id === newSlide.id,
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
