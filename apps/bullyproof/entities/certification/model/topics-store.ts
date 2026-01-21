import { create } from "zustand";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { certificationApi } from "@/entities/certification/api/endpoints";
import type { courseTopics, topicSlides } from "@/server/db/schema";

type CertificationTopic = typeof courseTopics.$inferSelect;
type CertificationSlide = typeof topicSlides.$inferSelect & {
  signedUrl?: string | null;
};

type CertificationTopicWithSlides = CertificationTopic & {
  slides?: CertificationSlide[];
  // Enriched data from view
  slideCount?: number;
  hasQuiz?: boolean;
  quizCompleted?: boolean;
  quizScorePercentage?: number | null;
};

interface CertificationTopicsState {
  // Normalized cache: topicId -> CertificationTopicWithSlides
  topics: Record<string, CertificationTopicWithSlides>;
  // Course code -> topic IDs mapping: courseCode -> topicId[]
  topicsByCourseCode: Record<string, string[]>;
  // Legacy: Stage code -> topic IDs mapping (for backward compatibility)
  topicsByStageCode: Record<string, string[]>;
  // Loading states
  loading: Record<string, boolean>;
  // Error states
  errors: Record<string, string | null>;
  
  // Actions
  setTopics: (topics: CertificationTopicWithSlides[]) => void;
  setTopic: (topic: CertificationTopicWithSlides) => void;
  setTopicsForCourseCode: (courseCode: string, topics: CertificationTopicWithSlides[]) => void;
  setTopicsForStageCode: (stageCode: string, topics: CertificationTopicWithSlides[]) => void; // Legacy
  removeTopic: (topicId: string) => void;
  clearTopics: () => void;
  
  // Reactive fetching - auto-fetches if missing
  getTopics: (courseCode: string, options?: { includeSlides?: boolean; includeUrls?: boolean }) => Promise<CertificationTopicWithSlides[]>;
  getTopic: (topicId: string, options?: { includeSlides?: boolean; includeUrls?: boolean }) => Promise<CertificationTopicWithSlides | null>;
  // Fetch enriched data and merge with existing topics
  getEnrichedTopics: (courseCode: string) => Promise<void>;
}

// Cache expiry: 1 week in milliseconds (matching the signed URL expiry)
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// Helper function to normalize slide URLs - maps signedImageUrl → signedUrl
function normalizeTopicSlides(topic: CertificationTopicWithSlides): CertificationTopicWithSlides {
  if (!topic.slides || topic.slides.length === 0) {
    return topic;
  }

  return {
    ...topic,
    slides: topic.slides.map((slide) => {
      // Normalize signedImageUrl to signedUrl for consistency
      // The API may return signedImageUrl (from topicSlidesService) or signedUrl (from certificationSlidesService)
      const normalizedSlide = {
        ...slide,
        signedUrl: (slide as any).signedImageUrl || slide.signedUrl || null,
      };
      
      // Remove signedImageUrl to avoid confusion (keep only signedUrl)
      if ('signedImageUrl' in normalizedSlide) {
        delete (normalizedSlide as any).signedImageUrl;
      }
      
      return normalizedSlide;
    }),
  };
}

export const useCertificationTopicsStore = create<CertificationTopicsState>((set, get) => ({
  topics: {},
  topicsByCourseCode: {},
  topicsByStageCode: {}, // Legacy
  loading: {},
  errors: {},
  
  setTopics: (topics) =>
    set((state) => {
      const newTopics = { ...state.topics };
      const newTopicsByStageCode: Record<string, string[]> = { ...state.topicsByStageCode };
      
      topics.forEach((topic) => {
        // Normalize slide URLs (signedImageUrl → signedUrl) before storing
        const normalizedTopic = normalizeTopicSlides(topic);
        newTopics[normalizedTopic.id] = normalizedTopic;
        // URLs are already stored in topic.slides[slideId].signedUrl
        // No need for separate slideUrls map - URLs are nested in slides
      });
      
      return {
        topics: newTopics,
        topicsByStageCode: newTopicsByStageCode,
      };
    }),
  
  setTopic: (topic) =>
    set((state) => {
      // Normalize slide URLs (signedImageUrl → signedUrl) before storing
      const normalizedTopic = normalizeTopicSlides(topic);
      const newTopics = { ...state.topics, [normalizedTopic.id]: normalizedTopic };
      
      // URLs are already stored in topic.slides[slideId].signedUrl
      // No need for separate slideUrls map - URLs are nested in slides
      
      return {
        topics: newTopics,
      };
    }),
  
  setTopicsForCourseCode: (courseCode, topics) =>
    set((state) => {
      const newTopics = { ...state.topics };
      const newTopicsByCourseCode = { ...state.topicsByCourseCode, [courseCode]: topics.map((t) => t.id) };
      
      topics.forEach((topic) => {
        // Normalize slide URLs (signedImageUrl → signedUrl) before storing
        const normalizedTopic = normalizeTopicSlides(topic);
        newTopics[normalizedTopic.id] = normalizedTopic;
        // URLs are already stored in topic.slides[slideId].signedUrl
        // No need for separate slideUrls map - URLs are nested in slides
      });
      
      return {
        topics: newTopics,
        topicsByCourseCode: newTopicsByCourseCode,
        topicsByStageCode: { ...state.topicsByStageCode, [courseCode]: topics.map((t) => t.id) }, // Legacy
      };
    }),
  
  setTopicsForStageCode: (stageCode, topics) => {
    // Legacy: delegate to setTopicsForCourseCode
    const store = get();
    store.setTopicsForCourseCode(stageCode, topics);
  },
  
  removeTopic: (topicId) =>
    set((state) => {
      const { [topicId]: removed, ...topics } = state.topics;
      const newTopicsByStageCode: Record<string, string[]> = {};
      
      // Rebuild course code mappings
      const newTopicsByCourseCode: Record<string, string[]> = {};
      Object.entries(state.topicsByCourseCode).forEach(([courseCode, topicIds]) => {
        newTopicsByCourseCode[courseCode] = topicIds.filter((id) => id !== topicId);
      });
      
      // Legacy: rebuild stage code mappings
      Object.entries(state.topicsByStageCode).forEach(([stageCode, topicIds]) => {
        newTopicsByStageCode[stageCode] = topicIds.filter((id) => id !== topicId);
      });
      
      return {
        topics,
        topicsByCourseCode: newTopicsByCourseCode,
        topicsByStageCode: newTopicsByStageCode,
      };
    }),
  
  clearTopics: () => set({ topics: {}, topicsByCourseCode: {}, topicsByStageCode: {}, loading: {}, errors: {} }),
  
  // Reactive fetching methods
  getTopics: async (courseCode: string, options?: { includeSlides?: boolean; includeUrls?: boolean }) => {
    const state = get();
    
    // Check cache first
    const topicIds = state.topicsByCourseCode[courseCode] || [];
    if (topicIds.length > 0) {
      const cachedTopics = topicIds
        .map((id) => state.topics[id])
        .filter(Boolean);
      // If we have all topics cached and they have slides if requested, return them
      if (cachedTopics.length === topicIds.length) {
        const hasSlides = !options?.includeSlides || cachedTopics.every((t) => t.slides !== undefined);
        if (hasSlides) {
          return cachedTopics;
        }
      }
    }
    
    // If already loading, wait a bit and check cache again
    if (state.loading[courseCode]) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const currentState = get();
          if (!currentState.loading[courseCode]) {
            clearInterval(checkInterval);
            const topicIds = currentState.topicsByCourseCode[courseCode] || [];
            const topics = topicIds.map((id) => currentState.topics[id]).filter(Boolean);
            resolve(topics);
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve([]);
        }, 5000);
      });
    }
    
    // Set loading state
    set((s) => ({
      loading: { ...s.loading, [courseCode]: true },
      errors: { ...s.errors, [courseCode]: null },
    }));
    
    try {
      const result = await certificationApi.topics.byCourseCode(courseCode, {
        includeSlides: options?.includeSlides ?? true,
        includeUrls: options?.includeUrls ?? true,
      });
      
      if (result.error) {
        const errorMessage = result.error.message || "Failed to fetch certification topics";
        set((s) => ({
          loading: { ...s.loading, [courseCode]: false },
          errors: { ...s.errors, [courseCode]: errorMessage },
        }));
        return [];
      }
      
      if (result.data) {
        // Update store with normalized data (URLs are already in slides)
        const store = get();
        store.setTopicsForCourseCode(courseCode, result.data as CertificationTopicWithSlides[]);
        
        set((s) => ({
          loading: { ...s.loading, [courseCode]: false },
          errors: { ...s.errors, [courseCode]: null },
        }));
        
        return result.data as CertificationTopicWithSlides[];
      }
      
      set((s) => ({
        loading: { ...s.loading, [courseCode]: false },
        errors: { ...s.errors, [courseCode]: "No topics found" },
      }));
      return [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch certification topics";
      set((s) => ({
        loading: { ...s.loading, [courseCode]: false },
        errors: { ...s.errors, [courseCode]: errorMessage },
      }));
      return [];
    }
  },
  
  getTopic: async (topicId: string, options?: { includeSlides?: boolean; includeUrls?: boolean }) => {
    const state = get();
    
    // Check cache first
    if (state.topics[topicId]) {
      const cached = state.topics[topicId];
      // If we have slides if requested, return cached
      if (!options?.includeSlides || cached.slides !== undefined) {
        return cached;
      }
    }
    
    // If already loading, wait a bit and check cache again
    if (state.loading[topicId]) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const currentState = get();
          if (!currentState.loading[topicId]) {
            clearInterval(checkInterval);
            resolve(currentState.topics[topicId] || null);
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(null);
        }, 5000);
      });
    }
    
    // Set loading state
    set((s) => ({
      loading: { ...s.loading, [topicId]: true },
      errors: { ...s.errors, [topicId]: null },
    }));
    
    try {
      const result = await certificationApi.topics.byId(topicId, {
        includeSlides: options?.includeSlides ?? true,
        includeUrls: options?.includeUrls ?? true,
      });
      
      if (result.error) {
        const errorMessage = result.error.message || "Failed to fetch certification topic";
        set((s) => ({
          loading: { ...s.loading, [topicId]: false },
          errors: { ...s.errors, [topicId]: errorMessage },
        }));
        return null;
      }
      
      if (result.data) {
        const topicData = result.data as CertificationTopicWithSlides;
        
        // Update store (URLs are already in slides)
        const store = get();
        store.setTopic(topicData);
        
        set((s) => ({
          loading: { ...s.loading, [topicId]: false },
          errors: { ...s.errors, [topicId]: null },
        }));
        
        return topicData;
      }
      
      set((s) => ({
        loading: { ...s.loading, [topicId]: false },
        errors: { ...s.errors, [topicId]: "Topic not found" },
      }));
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch certification topic";
      set((s) => ({
        loading: { ...s.loading, [topicId]: false },
        errors: { ...s.errors, [topicId]: errorMessage },
      }));
      return null;
    }
  },
  
  // Fetch enriched data and merge with existing topics
  getEnrichedTopics: async (courseCode: string) => {
    const state = get();
    
    // If already loading, skip
    if (state.loading[`${courseCode}_enriched`]) {
      return;
    }
    
    // Set loading state
    set((s) => ({
      loading: { ...s.loading, [`${courseCode}_enriched`]: true },
      errors: { ...s.errors, [`${courseCode}_enriched`]: null },
    }));
    
    try {
      const result = await certificationApi.topics.enriched.byCourseCode(courseCode);
      
      if (result.error) {
        const errorMessage = result.error.message || "Failed to fetch enriched topics";
        set((s) => ({
          loading: { ...s.loading, [`${courseCode}_enriched`]: false },
          errors: { ...s.errors, [`${courseCode}_enriched`]: errorMessage },
        }));
        return;
      }
      
      if (result.data) {
        // Merge enriched data with existing topics
        const enrichedData = result.data;
        const currentTopics = { ...state.topics };
        
        enrichedData.forEach((enriched) => {
          const topicId = enriched.topicId;
          if (currentTopics[topicId]) {
            // Merge enriched fields into existing topic
            // Ensure boolean values are properly set (not undefined)
            currentTopics[topicId] = {
              ...currentTopics[topicId],
              slideCount: enriched.slideCount ?? currentTopics[topicId].slideCount,
              hasQuiz: enriched.hasQuiz ?? false,
              quizCompleted: enriched.quizCompleted ?? false,
              quizScorePercentage: enriched.quizScorePercentage ?? currentTopics[topicId].quizScorePercentage,
            };
          }
        });
        
        set((s) => ({
          topics: currentTopics,
          loading: { ...s.loading, [`${courseCode}_enriched`]: false },
          errors: { ...s.errors, [`${courseCode}_enriched`]: null },
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch enriched topics";
      set((s) => ({
        loading: { ...s.loading, [`${courseCode}_enriched`]: false },
        errors: { ...s.errors, [`${courseCode}_enriched`]: errorMessage },
      }));
    }
  },
}));

// React Query hooks for certification topics
export function useCertificationTopicsByCourseCode(
  courseCode: string | null | undefined,
  options?: { includeSlides?: boolean; includeUrls?: boolean }
) {
  const queryClient = useQueryClient();
  const { topics, topicsByCourseCode, setTopicsForCourseCode } = useCertificationTopicsStore();

  const query = useQuery({
    queryKey: ["certification", "topics", courseCode, options?.includeSlides, options?.includeUrls],
    queryFn: async () => {
      if (!courseCode) return [];
      
      const result = await certificationApi.topics.byCourseCode(courseCode, {
        includeSlides: options?.includeSlides,
        includeUrls: options?.includeUrls,
      });
      
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch certification topics");
      }
      
      if (result.data) {
        // Update Zustand store with normalized data
        setTopicsForCourseCode(courseCode, result.data as CertificationTopicWithSlides[]);
        return result.data as CertificationTopicWithSlides[];
      }
      
      return [];
    },
    enabled: !!courseCode,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Use initialData from Zustand if available for immediate display
    initialData: () => {
      const topicIds = courseCode ? topicsByCourseCode[courseCode] || [] : [];
      const zustandTopics = topicIds
        .map((id) => topics[id])
        .filter(Boolean);
      return zustandTopics.length > 0 ? zustandTopics : undefined;
    },
  });

  const topicIds = courseCode ? topicsByCourseCode[courseCode] || [] : [];
  const topicsList = useMemo(() => {
    return topicIds
      .map((id) => topics[id])
      .filter(Boolean)
      .sort((a, b) => {
        if (a.courseOrder === null) return 1;
        if (b.courseOrder === null) return -1;
        return a.courseOrder - b.courseOrder;
      });
  }, [topicIds, topics]);

  // Use React Query's cached data (which includes initialData) for immediate display
  return {
    ...query,
    topics: query.data || topicsList,
  };
}

// Legacy hook for backward compatibility
export function useCertificationTopicsByStageCode(
  stageCode: string | null | undefined,
  options?: { includeSlides?: boolean; includeUrls?: boolean }
) {
  return useCertificationTopicsByCourseCode(stageCode, options);
}

export function useCertificationTopic(
  topicId: string | null | undefined,
  options?: { includeSlides?: boolean; includeUrls?: boolean }
) {
  const queryClient = useQueryClient();
  const { topics, setTopic } = useCertificationTopicsStore();

  const query = useQuery({
    queryKey: ["certification", "topics", "by-id", topicId, options?.includeSlides, options?.includeUrls],
    queryFn: async () => {
      if (!topicId) return null;
      
      const result = await certificationApi.topics.byId(topicId, {
        includeSlides: options?.includeSlides,
        includeUrls: options?.includeUrls,
      });
      
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch certification topic");
      }
      
      if (result.data) {
        const topicData = result.data as CertificationTopicWithSlides;
        
        // Update Zustand store
        setTopic(topicData);
        return topicData;
      }
      
      return null;
    },
    enabled: !!topicId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Use React Query's cached data directly for immediate display
  // Fallback to Zustand store if React Query doesn't have data yet
  const cachedTopic = query.data || (topicId ? topics[topicId] : null);

  return {
    ...query,
    topic: cachedTopic,
  };
}

// Reactive hooks that use store's reactive methods (new simplified versions)
export function useCertificationTopicsReactive(
  courseCode: string | null | undefined,
  options?: { includeSlides?: boolean; includeUrls?: boolean }
) {
  const { topics, topicsByCourseCode, getTopics, getEnrichedTopics, loading, errors } = useCertificationTopicsStore();
  const [topicsList, setTopicsList] = useState<CertificationTopicWithSlides[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseCode) {
      setTopicsList([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Check cache first
    const topicIds = topicsByCourseCode[courseCode] || [];
    if (topicIds.length > 0) {
      const cachedTopics = topicIds
        .map((id) => topics[id])
        .filter(Boolean)
        .sort((a, b) => {
          if (a.courseOrder === null) return 1;
          if (b.courseOrder === null) return -1;
          return a.courseOrder - b.courseOrder;
        });
      
      const hasSlides = !options?.includeSlides || cachedTopics.every((t) => t.slides !== undefined);
      if (hasSlides && cachedTopics.length === topicIds.length) {
        setTopicsList(cachedTopics);
        setIsLoading(false);
        setError(null);
        
        // Fetch enriched data in background if not already present
        const hasEnrichedData = cachedTopics.every((t) => 
          t.slideCount !== undefined && t.hasQuiz !== undefined
        );
        if (!hasEnrichedData && !loading[`${courseCode}_enriched`]) {
          getEnrichedTopics(courseCode);
        }
        return;
      }
    }

    // Check loading/error state
    setIsLoading(loading[courseCode] || false);
    setError(errors[courseCode] || null);

    // Fetch if not in cache
    getTopics(courseCode, options).then((fetchedTopics) => {
      setTopicsList(fetchedTopics);
      setIsLoading(false);
      setError(fetchedTopics.length === 0 && !errors[courseCode] ? "No topics found" : errors[courseCode] || null);
      
      // Fetch enriched data after topics are loaded
      if (fetchedTopics.length > 0) {
        getEnrichedTopics(courseCode);
      }
    });
  }, [courseCode, topics, topicsByCourseCode, getTopics, getEnrichedTopics, loading, errors, options?.includeSlides, options?.includeUrls]);

  // Update topics list when enriched data is loaded
  useEffect(() => {
    const topicIds = courseCode ? topicsByCourseCode[courseCode] || [] : [];
    if (topicIds.length > 0) {
      const updatedTopics = topicIds
        .map((id) => topics[id])
        .filter(Boolean)
        .sort((a, b) => {
          if (a.courseOrder === null) return 1;
          if (b.courseOrder === null) return -1;
          return a.courseOrder - b.courseOrder;
        });
      setTopicsList(updatedTopics);
    }
  }, [topics, courseCode, topicsByCourseCode]);

  return {
    topics: topicsList,
    isLoading,
    error,
  };
}

// Helper function to get cached slide URL from nested slide structure
export function useCertificationSlideUrl(slideId: string | null | undefined) {
  const { topics } = useCertificationTopicsStore();
  
  // Use useMemo to ensure consistent hook ordering and memoize the result
  return useMemo(() => {
    if (!slideId) return null;
    
    // Find the slide in any topic's slides array
    for (const topic of Object.values(topics)) {
      if (topic.slides) {
        const slide = topic.slides.find((s) => s.id === slideId);
        if (slide?.signedUrl) {
          return slide.signedUrl;
        }
      }
    }
    
    return null;
  }, [slideId, topics]);
}

// Helper function to invalidate certification topic cache
export function useInvalidateCertificationTopics() {
  const queryClient = useQueryClient();
  
  return {
    invalidateTopic: (topicId: string) => {
      queryClient.invalidateQueries({ queryKey: ["certification", "topics", "by-id", topicId] });
      // Also invalidate any stage code queries that might contain this topic
      queryClient.invalidateQueries({ queryKey: ["certification", "topics"] });
    },
    invalidateTopicsByCourseCode: (courseCode: string) => {
      queryClient.invalidateQueries({ queryKey: ["certification", "topics", courseCode] });
    },
    invalidateTopicsByStageCode: (stageCode: string) => {
      // Legacy: delegate to course code invalidation
      queryClient.invalidateQueries({ queryKey: ["certification", "topics", stageCode] });
    },
    invalidateAllTopics: () => {
      queryClient.invalidateQueries({ queryKey: ["certification", "topics"] });
    },
  };
}
