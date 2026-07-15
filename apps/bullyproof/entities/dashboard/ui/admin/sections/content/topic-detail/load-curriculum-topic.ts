import {
  compareSlidesByPosition,
  computePositionsForOrder,
} from "@/lib/fractional-position";

import { slideHasContent } from "./lib";
import type { CertificationTopic, ExtendedSlideData, Topic } from "./types";

export interface LoadCurriculumTopicDeps {
  isCertification: boolean;
  stageSlug: string | undefined;
  topicSlug: string | undefined;
  isLoadingStage: boolean;
  isLoadingTopics: boolean;
  stageError: any;
  topicsError: any;
  cachedStage: any;
  cachedTopics: any;
  foundTopic: any;
  topic: Topic | CertificationTopic | null;
  lastProcessedTopicIdRef: React.MutableRefObject<string | null>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setStage: React.Dispatch<React.SetStateAction<any | null>>;
  setTopic: React.Dispatch<
    React.SetStateAction<Topic | CertificationTopic | null>
  >;
  setLocalSlides: React.Dispatch<React.SetStateAction<ExtendedSlideData[]>>;
  setOriginalSlides: React.Dispatch<React.SetStateAction<ExtendedSlideData[]>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  setDeletedSlideIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingFileUploads: React.Dispatch<
    React.SetStateAction<Map<string, File>>
  >;
  setSlideUrl: (slideId: string, url: string) => void;
}

// Body of the "Handle curriculum flow with cached data" effect; the useEffect
// wrapper (and its dependency array) stays in the orchestrator unchanged.
export function loadCurriculumTopic(deps: LoadCurriculumTopicDeps) {
  const {
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
  } = deps;

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
    foundTopic.slides?.sort(compareSlidesByPosition).map((slide: any) => ({
      id: slide.id,
      kind: slide.kind as "text" | "image" | "video",
      position: slide.position,
      textHtml: slide.textHtml ?? null,
      imageUrl: slide.imageUrl ?? null,
      videoUrl: slide.videoUrl ?? null,
      videoStartS: slide.videoStartS ?? null,
      videoEndS: slide.videoEndS ?? null,
      effectiveNotes: slide.officialNotes ?? null,
      signedUrl: slide.signedUrl ?? null,
    })) ?? [];

  // Filter out empty slides (including ghost image slides with no valid URL/signedUrl)
  console.log(
    "[topic-detail] Loading slides - total slides from DB:",
    allSlides.length,
  );
  const validSlides = allSlides.filter((slide: any) => {
    const hasContent = slideHasContent(slide, isCertification);
    if (!hasContent) {
      console.warn("[topic-detail] Found empty slide:", {
        id: slide.id,
        kind: slide.kind,
        imageUrl: slide.imageUrl?.substring(0, 100),
        videoUrl: slide.videoUrl,
        textHtml: slide.textHtml?.substring(0, 50),
        position: slide.position,
      });
    } else {
      // Log details for the last slide to debug why it might appear empty
      if (
        allSlides.length > 0 &&
        allSlides[allSlides.length - 1]?.id === slide.id
      ) {
        console.log("[topic-detail] Last slide content check:", {
          id: slide.id,
          kind: slide.kind,
          imageUrl: slide.imageUrl?.substring(0, 100),
          hasImageUrl: !!slide.imageUrl,
          videoUrl: slide.videoUrl,
          textHtml: slide.textHtml?.substring(0, 50),
          position: slide.position,
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

  // Assign fractional positions for display order
  const validIds = validSlides.map((s: any) => s.id);
  const positions = computePositionsForOrder(validIds);
  const initialSlides = validSlides.map((slide: any, index: number) => ({
    ...slide,
    position: positions[index],
  }));

  // If we filtered out any slides (including empty image slides / ghost slides), mark them for deletion
  if (allSlides.length !== validSlides.length) {
    const emptySlideIds = allSlides
      .filter((slide: any) => !slideHasContent(slide, isCertification))
      .map((slide: any) => slide.id);
    console.log(
      "[topic-detail] Marking empty slides for deletion:",
      emptySlideIds,
    );
    setDeletedSlideIds(new Set(emptySlideIds));
    setHasUnsavedChanges(true);
  } else {
    setHasUnsavedChanges(false);
    setDeletedSlideIds(new Set());
  }

  console.log(
    "[topic-detail] Setting local slides:",
    initialSlides.length,
    "slides",
  );
  setLocalSlides(initialSlides);
  setOriginalSlides(JSON.parse(JSON.stringify(initialSlides)));
  setPendingFileUploads(new Map());

  // Cache signed URLs if they exist (don't invalidate - we just cached them!)
  // Batch these updates - Zustand will batch them automatically
  initialSlides.forEach((slide: any) => {
    if (slide.kind === "image" && (slide as any).signedUrl) {
      setSlideUrl(slide.id, (slide as any).signedUrl);
    }
  });

  setIsLoading(false);
  setError(null);
}
