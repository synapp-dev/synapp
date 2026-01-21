import { create } from "zustand";
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

