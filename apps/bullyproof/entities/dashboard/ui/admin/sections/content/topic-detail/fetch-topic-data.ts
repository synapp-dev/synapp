import {
  compareSlidesByPosition,
  computePositionsForOrder,
} from "@/lib/fractional-position";
import { certificationApi } from "@/entities/certification/api/endpoints";
import type { QuizData } from "@/components/organisms/quiz-slide-editor";
import type { SlideData } from "@/components/organisms/slide-renderer";

import { slideHasContent } from "./lib";
import type { CertificationTopic, ExtendedSlideData, Topic } from "./types";

export interface FetchTopicDataDeps {
  isCertification: boolean;
  topicId: string | undefined;
  excludeQuizSlides: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
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
}

// Body of the fetchTopicData callback (certification flow); the useCallback
// wrapper stays in the orchestrator so hook order and dependencies are unchanged.
export async function fetchTopicDataImpl(
  deps: FetchTopicDataDeps,
  skipLoading = false,
) {
  const {
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
  } = deps;

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
            "Failed to fetch certification topic",
        );
        return;
      }

      setTopic(topicResult.data);

      // Fetch slides separately (this includes signedUrl from batch fetch)
      const slidesResult =
        await certificationApi.topics.slides.list(topicId);
      if (slidesResult.data) {
        const allSlides: ExtendedSlideData[] = slidesResult.data
          .sort(compareSlidesByPosition)
          .map((slide) => {
            const s = slide as typeof slide & {
              signedUrl?: string | null;
              signedImageUrl?: string | null;
              signedVideoUrl?: string | null;
            };
            // GET /certification/topics/:id/slides uses topicSlidesService → signedImageUrl / signedVideoUrl.
            // SlideRenderer only paints storage-backed images from signed URLs (not raw imageUrl).
            const imageSigned = s.signedUrl ?? s.signedImageUrl ?? null;
            return {
              id: slide.id,
              kind: slide.kind as SlideData["kind"],
              position: slide.position,
              textHtml: slide.textHtml ?? null,
              imageUrl: slide.imageUrl ?? null,
              videoUrl: slide.videoUrl ?? null,
              videoStartS: slide.videoStartS ?? null,
              videoEndS: slide.videoEndS ?? null,
              quizData: (slide as any).quizData as QuizData | null,
              effectiveNotes: (slide as any).officialNotes ?? null,
              signedUrl: imageSigned,
              signedImageUrl: s.signedImageUrl ?? null,
              signedVideoUrl: s.signedVideoUrl ?? null,
            };
          });

        // Filter out empty slides (slides without any content)
        // Note: Image slides are always shown, even if empty, so users can add images to them
        console.log(
          "[topic-detail] [CERTIFICATION] Loading slides - total slides from DB:",
          allSlides.length,
        );
        const validSlides = allSlides.filter((slide) => {
          const hasContent = slideHasContent(slide, isCertification);
          if (!hasContent) {
            console.warn(
              "[topic-detail] [CERTIFICATION] Found empty slide:",
              {
                id: slide.id,
                kind: slide.kind,
                imageUrl: slide.imageUrl,
                videoUrl: slide.videoUrl,
                textHtml: slide.textHtml?.substring(0, 50),
                quizData: (slide as any).quizData ? "exists" : "null",
              },
            );
          }
          return hasContent;
        });

        console.log(
          "[topic-detail] [CERTIFICATION] After filtering empty slides:",
          {
            total: allSlides.length,
            valid: validSlides.length,
            empty: allSlides.length - validSlides.length,
          },
        );

        // Filter out quiz slides if excludeQuizSlides is true
        let filteredSlides = validSlides;
        if (excludeQuizSlides) {
          filteredSlides = validSlides.filter(
            (slide) => slide.kind !== "quiz",
          );
          console.log(
            "[topic-detail] [CERTIFICATION] Filtered out quiz slides:",
            {
              before: validSlides.length,
              after: filteredSlides.length,
              quizCount: validSlides.length - filteredSlides.length,
            },
          );
        }

        // Assign fractional positions for display order
        const validIds = filteredSlides.map((s) => s.id);
        const positions = computePositionsForOrder(validIds);
        const initialSlides = filteredSlides.map((slide, index) => ({
          ...slide,
          position: positions[index],
        }));

        // If we filtered out any slides (non-image slides), mark them for deletion
        // Mark empty slides (including ghost image slides) for deletion
        const emptySlideIds = allSlides
          .filter((slide) => !slideHasContent(slide, isCertification))
          .map((slide) => slide.id);

        if (emptySlideIds.length > 0) {
          console.log(
            "[topic-detail] [CERTIFICATION] Marking empty slides for deletion:",
            emptySlideIds,
          );
        }

        console.log(
          "[topic-detail] [CERTIFICATION] Setting local slides:",
          initialSlides.length,
          "slides",
        );
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
      err instanceof Error ? err.message : "Failed to fetch topic details",
    );
  } finally {
    if (!skipLoading) {
      setIsLoading(false);
    }
  }
}
