import { create } from "zustand";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { certificationApi } from "@/entities/certification/api/endpoints";
import type { certificationTopics, certificationSlides } from "@/server/db/schema";

type CertificationTopic = typeof certificationTopics.$inferSelect;
type CertificationSlide = typeof certificationSlides.$inferSelect & {
  signedUrl?: string | null;
};

type CertificationTopicWithSlides = CertificationTopic & {
  slides?: CertificationSlide[];
};

interface CertificationTopicsState {
  // Normalized cache: topicId -> CertificationTopicWithSlides
  topics: Record<string, CertificationTopicWithSlides>;
  // Stage code -> topic IDs mapping: stageCode -> topicId[]
  topicsByStageCode: Record<string, string[]>;
  // Signed URLs cache: slideId -> { url: string, timestamp: number }
  slideUrls: Record<string, { url: string; timestamp: number }>;
  
  // Actions
  setTopics: (topics: CertificationTopicWithSlides[]) => void;
  setTopic: (topic: CertificationTopicWithSlides) => void;
  setTopicsForStageCode: (stageCode: string, topics: CertificationTopicWithSlides[]) => void;
  setSlideUrl: (slideId: string, url: string) => void;
  removeTopic: (topicId: string) => void;
  invalidateSlideUrl: (slideId: string) => void;
  clearTopics: () => void;
}

// Cache expiry: 1 week in milliseconds (matching the signed URL expiry)
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export const useCertificationTopicsStore = create<CertificationTopicsState>((set, get) => ({
  topics: {},
  topicsByStageCode: {},
  slideUrls: {},
  
  setTopics: (topics) =>
    set((state) => {
      const newTopics = { ...state.topics };
      const newTopicsByStageCode: Record<string, string[]> = { ...state.topicsByStageCode };
      
      topics.forEach((topic) => {
        newTopics[topic.id] = topic;
        
        // Extract and cache signed URLs from slides
        if (topic.slides) {
          topic.slides.forEach((slide) => {
            if (slide.kind === "image" && slide.signedUrl) {
              const currentState = get();
              if (!currentState.slideUrls[slide.id] || 
                  Date.now() - currentState.slideUrls[slide.id].timestamp > CACHE_EXPIRY_MS) {
                set((s) => ({
                  slideUrls: {
                    ...s.slideUrls,
                    [slide.id]: {
                      url: slide.signedUrl!,
                      timestamp: Date.now(),
                    },
                  },
                }));
              }
            }
          });
        }
      });
      
      return {
        topics: newTopics,
        topicsByStageCode: newTopicsByStageCode,
      };
    }),
  
  setTopic: (topic) =>
    set((state) => {
      const newTopics = { ...state.topics, [topic.id]: topic };
      
      // Extract and cache signed URLs from slides
      if (topic.slides) {
        topic.slides.forEach((slide) => {
          if (slide.kind === "image" && slide.signedUrl) {
            const currentState = get();
            if (!currentState.slideUrls[slide.id] || 
                Date.now() - currentState.slideUrls[slide.id].timestamp > CACHE_EXPIRY_MS) {
              set((s) => ({
                slideUrls: {
                  ...s.slideUrls,
                  [slide.id]: {
                    url: slide.signedUrl!,
                    timestamp: Date.now(),
                  },
                },
              }));
            }
          }
        });
      }
      
      return {
        topics: newTopics,
      };
    }),
  
  setTopicsForStageCode: (stageCode, topics) =>
    set((state) => {
      const newTopics = { ...state.topics };
      const newTopicsByStageCode = { ...state.topicsByStageCode, [stageCode]: topics.map((t) => t.id) };
      
      topics.forEach((topic) => {
        newTopics[topic.id] = topic;
        
        // Extract and cache signed URLs from slides
        if (topic.slides) {
          topic.slides.forEach((slide) => {
            if (slide.kind === "image" && slide.signedUrl) {
              const currentState = get();
              if (!currentState.slideUrls[slide.id] || 
                  Date.now() - currentState.slideUrls[slide.id].timestamp > CACHE_EXPIRY_MS) {
                set((s) => ({
                  slideUrls: {
                    ...s.slideUrls,
                    [slide.id]: {
                      url: slide.signedUrl!,
                      timestamp: Date.now(),
                    },
                  },
                }));
              }
            }
          });
        }
      });
      
      return {
        topics: newTopics,
        topicsByStageCode: newTopicsByStageCode,
      };
    }),
  
  setSlideUrl: (slideId, url) =>
    set((state) => ({
      slideUrls: {
        ...state.slideUrls,
        [slideId]: {
          url,
          timestamp: Date.now(),
        },
      },
    })),
  
  removeTopic: (topicId) =>
    set((state) => {
      const { [topicId]: removed, ...topics } = state.topics;
      const newTopicsByStageCode: Record<string, string[]> = {};
      
      // Rebuild stage code mappings
      Object.entries(state.topicsByStageCode).forEach(([stageCode, topicIds]) => {
        newTopicsByStageCode[stageCode] = topicIds.filter((id) => id !== topicId);
      });
      
      return {
        topics,
        topicsByStageCode: newTopicsByStageCode,
      };
    }),
  
  invalidateSlideUrl: (slideId) =>
    set((state) => {
      const { [slideId]: removed, ...slideUrls } = state.slideUrls;
      return { slideUrls };
    }),
  
  clearTopics: () => set({ topics: {}, topicsByStageCode: {}, slideUrls: {} }),
}));

// React Query hooks for certification topics
export function useCertificationTopicsByStageCode(
  stageCode: string | null | undefined,
  options?: { includeSlides?: boolean; includeUrls?: boolean }
) {
  const queryClient = useQueryClient();
  const { topics, topicsByStageCode, setTopicsForStageCode } = useCertificationTopicsStore();

  const query = useQuery({
    queryKey: ["certification", "topics", stageCode, options?.includeSlides, options?.includeUrls],
    queryFn: async () => {
      if (!stageCode) return [];
      
      const result = await certificationApi.topics.byStageCode(stageCode, {
        includeSlides: options?.includeSlides,
        includeUrls: options?.includeUrls,
      });
      
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch certification topics");
      }
      
      if (result.data) {
        // Update Zustand store with normalized data
        setTopicsForStageCode(stageCode, result.data as CertificationTopicWithSlides[]);
        return result.data as CertificationTopicWithSlides[];
      }
      
      return [];
    },
    enabled: !!stageCode,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Use initialData from Zustand if available for immediate display
    initialData: () => {
      const topicIds = stageCode ? topicsByStageCode[stageCode] || [] : [];
      const zustandTopics = topicIds
        .map((id) => topics[id])
        .filter(Boolean);
      return zustandTopics.length > 0 ? zustandTopics : undefined;
    },
  });

  const topicIds = stageCode ? topicsByStageCode[stageCode] || [] : [];
  const topicsList = useMemo(() => {
    return topicIds
      .map((id) => topics[id])
      .filter(Boolean)
      .sort((a, b) => {
        if (a.stageOrder === null) return 1;
        if (b.stageOrder === null) return -1;
        return a.stageOrder - b.stageOrder;
      });
  }, [topicIds, topics]);

  // Use React Query's cached data (which includes initialData) for immediate display
  return {
    ...query,
    topics: query.data || topicsList,
  };
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

// Helper function to get cached slide URL
export function useCertificationSlideUrl(slideId: string | null | undefined) {
  const { slideUrls } = useCertificationTopicsStore();
  
  if (!slideId) return null;
  
  const cached = slideUrls[slideId];
  if (!cached) return null;
  
  // Check if expired
  if (Date.now() - cached.timestamp > CACHE_EXPIRY_MS) {
    return null;
  }
  
  return cached.url;
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
    invalidateTopicsByStageCode: (stageCode: string) => {
      queryClient.invalidateQueries({ queryKey: ["certification", "topics", stageCode] });
    },
    invalidateAllTopics: () => {
      queryClient.invalidateQueries({ queryKey: ["certification", "topics"] });
    },
  };
}
