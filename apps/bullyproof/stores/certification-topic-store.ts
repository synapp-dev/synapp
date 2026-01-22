import { create } from "zustand";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { certificationApi } from "@/entities/certification/api/endpoints";
import { useCertificationSlidesCacheStore } from "@/stores/certification-slides-cache-store";
import type {
  courseTopics,
  topicSlides,
} from "@/server/db/schema";
import type { SlideData } from "@/components/organisms/slide-renderer";

type Topic = typeof courseTopics.$inferSelect;
type Slide = typeof topicSlides.$inferSelect;

type ExtendedSlideData = SlideData;

type Attempt = {
  id: string;
  attemptNumber: number;
  currentSlideId: string | null;
  currentSlideIndex: number | null;
  status: "not_started" | "viewing_slides" | "quiz_unlocked" | "completed";
  courseId: string;
  slideProgress?: Record<string, { viewed?: boolean; viewedAt?: string }>;
};

interface CertificationTopicState {
  // Topic data keyed by topicId
  topics: Record<string, Topic>;
  // Slides keyed by topicId
  slides: Record<string, ExtendedSlideData[]>;
  // Current attempts keyed by topicId
  attempts: Record<string, Attempt | null>;
  // Selected answers keyed by topicId, then slideId
  selectedAnswers: Record<string, Record<string, string>>;
  // Loading states keyed by topicId
  loading: Record<string, boolean>;
  // Errors keyed by topicId
  errors: Record<string, string | null>;

  // Setters
  setTopic: (topicId: string, topic: Topic) => void;
  setSlides: (topicId: string, slides: ExtendedSlideData[]) => void;
  setAttempt: (topicId: string, attempt: Attempt | null) => void;
  setSelectedAnswer: (
    topicId: string,
    slideId: string,
    answerId: string
  ) => void;
  setLoading: (topicId: string, loading: boolean) => void;
  setError: (topicId: string, error: string | null) => void;

  // Getters
  getTopic: (topicId: string) => Topic | null;
  getSlides: (topicId: string) => ExtendedSlideData[] | null;
  getAttempt: (topicId: string) => Attempt | null;
  getSelectedAnswers: (topicId: string) => Record<string, string>;

  // Check if a slide is unlocked
  isSlideUnlocked: (topicId: string, slideId: string, allSlideIds: string[]) => boolean;

  // Clear data for a topic
  clearTopic: (topicId: string) => void;
}

export const useCertificationTopicStore = create<CertificationTopicState>(
  (set, get) => ({
    topics: {},
    slides: {},
    attempts: {},
    selectedAnswers: {},
    loading: {},
    errors: {},

    setTopic: (topicId, topic) =>
      set((state) => ({
        topics: { ...state.topics, [topicId]: topic },
      })),

    setSlides: (topicId, slides) =>
      set((state) => ({
        slides: { ...state.slides, [topicId]: slides },
      })),

    setAttempt: (topicId, attempt) =>
      set((state) => ({
        attempts: { ...state.attempts, [topicId]: attempt },
      })),

    setSelectedAnswer: (topicId, slideId, answerId) =>
      set((state) => {
        const topicAnswers = state.selectedAnswers[topicId] || {};
        return {
          selectedAnswers: {
            ...state.selectedAnswers,
            [topicId]: { ...topicAnswers, [slideId]: answerId },
          },
        };
      }),

    setLoading: (topicId, loading) =>
      set((state) => ({
        loading: { ...state.loading, [topicId]: loading },
      })),

    setError: (topicId, error) =>
      set((state) => ({
        errors: { ...state.errors, [topicId]: error },
      })),

    getTopic: (topicId) => {
      const state = get();
      return state.topics[topicId] || null;
    },

    getSlides: (topicId) => {
      const state = get();
      return state.slides[topicId] || null;
    },

    getAttempt: (topicId) => {
      const state = get();
      return state.attempts[topicId] || null;
    },

    getSelectedAnswers: (topicId) => {
      const state = get();
      return state.selectedAnswers[topicId] || {};
    },

    isSlideUnlocked: (topicId, slideId, allSlideIds) => {
      const state = get();
      const attempt = state.attempts[topicId];
      
      if (!attempt || !attempt.slideProgress) {
        // First slide is always unlocked
        return allSlideIds.length > 0 && allSlideIds[0] === slideId;
      }

      // If topic is completed, all slides are unlocked for review
      if (attempt.status === "completed") {
        return true;
      }

      const slideProgress = attempt.slideProgress;
      const unlockedSlides: string[] = [];

      // First slide is always unlocked
      if (allSlideIds.length > 0) {
        unlockedSlides.push(allSlideIds[0]);
      }

      // Check each subsequent slide
      for (let i = 1; i < allSlideIds.length; i++) {
        const previousSlideId = allSlideIds[i - 1];
        const currentSlideId = allSlideIds[i];
        const previousProgress = slideProgress[previousSlideId];

        // Unlock if previous slide is viewed
        if (previousProgress) {
          if (previousProgress.viewed) {
            unlockedSlides.push(currentSlideId);
          } else {
            // Stop at first locked slide
            break;
          }
        } else {
          // Stop at first slide without progress
          break;
        }
      }

      return unlockedSlides.includes(slideId);
    },

    clearTopic: (topicId) =>
      set((state) => {
        const newTopics = { ...state.topics };
        const newSlides = { ...state.slides };
        const newAttempts = { ...state.attempts };
        const newSelectedAnswers = { ...state.selectedAnswers };
        const newLoading = { ...state.loading };
        const newErrors = { ...state.errors };

        delete newTopics[topicId];
        delete newSlides[topicId];
        delete newAttempts[topicId];
        delete newSelectedAnswers[topicId];
        delete newLoading[topicId];
        delete newErrors[topicId];

        return {
          topics: newTopics,
          slides: newSlides,
          attempts: newAttempts,
          selectedAnswers: newSelectedAnswers,
          loading: newLoading,
          errors: newErrors,
        };
      }),
  })
);

// React Query hook for fetching slides with progress
export function useCertificationTopicSlidesWithProgress(
  topicId: string | null | undefined
) {
  const { slides, attempts, setSlides, setAttempt } = useCertificationTopicStore();

  const query = useQuery({
    queryKey: ["certification", "topics", topicId, "slides-with-progress"],
    queryFn: async () => {
      if (!topicId) return null;

      const result = await certificationApi.topics.slides.withProgress(topicId);

      if (result.error) {
        throw new Error(
          result.error.message || "Failed to fetch slides with progress"
        );
      }

      if (result.data) {
        const { slides: slidesData, attempt } = result.data;
        const cacheStore = useCertificationSlidesCacheStore.getState();

        // Process slides to match ExtendedSlideData format and cache signed URLs
        const processedSlides: ExtendedSlideData[] = slidesData
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((slide) => {
            const slideWithUrl = slide as typeof slide & { signedUrl?: string | null };
            // Cache signed URLs for image slides
            if (slideWithUrl.signedUrl && slide.kind === "image") {
              cacheStore.setSlideUrl(slide.id, slideWithUrl.signedUrl);
            }

            return {
              id: slide.id,
              kind: slide.kind as SlideData["kind"],
              orderIndex: slide.orderIndex,
              textHtml: slide.textHtml ?? null,
              imageUrl: slide.imageUrl ?? null,
              videoUrl: slide.videoUrl ?? null,
              videoStartS: slide.videoStartS ?? null,
              videoEndS: slide.videoEndS ?? null,
              effectiveNotes: (slide as any).officialNotes ?? null,
            };
          });

        // Update Zustand store
        setSlides(topicId, processedSlides);
        if (attempt) {
          setAttempt(topicId, attempt as Attempt);
        }

        return {
          slides: processedSlides,
          attempt: attempt as Attempt | null,
        };
      }

      return null;
    },
    enabled: !!topicId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Use initialData from Zustand store for instant display
    initialData: () => {
      if (!topicId) return null;
      const cachedSlides = slides[topicId];
      const cachedAttempt = attempts[topicId];
      if (cachedSlides && cachedSlides.length > 0) {
        return {
          slides: cachedSlides,
          attempt: cachedAttempt || null,
        };
      }
      return undefined;
    },
  });

  // Use React Query's cached data (which includes initialData) for immediate display
  // Fallback to Zustand store if React Query doesn't have data yet
  const cachedData = useMemo(() => {
    if (query.data) {
      return query.data;
    }
    if (topicId) {
      const cachedSlides = slides[topicId];
      const cachedAttempt = attempts[topicId];
      if (cachedSlides && cachedSlides.length > 0) {
        return {
          slides: cachedSlides,
          attempt: cachedAttempt || null,
        };
      }
    }
    return null;
  }, [query.data, topicId, slides, attempts]);

  return {
    ...query,
    slides: cachedData?.slides || [],
    attempt: cachedData?.attempt || null,
  };
}

