import { create } from "zustand";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { topicsApi } from "@/entities/topics/api/endpoints";
import type { topics, topicSlides } from "@/server/db/schema";

type Topic = typeof topics.$inferSelect;
type TopicSlide = typeof topicSlides.$inferSelect & {
  signedUrl?: string | null;
};

type TopicWithSlides = Topic & {
  slides?: TopicSlide[];
};

interface TopicsState {
  // Normalized cache: topicId -> TopicWithSlides
  topics: Record<string, TopicWithSlides>;
  // Stage -> topic IDs mapping: stageId -> topicId[]
  topicsByStage: Record<string, string[]>;
  // Signed URLs cache: slideId -> { url: string, timestamp: number }
  slideUrls: Record<string, { url: string; timestamp: number }>;
  
  // Actions
  setTopics: (topics: TopicWithSlides[]) => void;
  setTopic: (topic: TopicWithSlides) => void;
  setTopicsForStage: (stageId: string, topics: TopicWithSlides[]) => void;
  setSlideUrl: (slideId: string, url: string) => void;
  removeTopic: (topicId: string) => void;
  invalidateSlideUrl: (slideId: string) => void;
  clearTopics: () => void;
}

// Cache expiry: 1 week in milliseconds (matching the signed URL expiry)
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export const useTopicsStore = create<TopicsState>((set, get) => ({
  topics: {},
  topicsByStage: {},
  slideUrls: {},
  
  setTopics: (topics) =>
    set((state) => {
      const newTopics = { ...state.topics };
      const newTopicsByStage: Record<string, string[]> = { ...state.topicsByStage };
      
      topics.forEach((topic) => {
        newTopics[topic.id] = topic;
        
        // Update stage mapping
        if (topic.stageId) {
          if (!newTopicsByStage[topic.stageId]) {
            newTopicsByStage[topic.stageId] = [];
          }
          if (!newTopicsByStage[topic.stageId].includes(topic.id)) {
            newTopicsByStage[topic.stageId].push(topic.id);
          }
        }
        
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
        topicsByStage: newTopicsByStage,
      };
    }),
  
  setTopic: (topic) =>
    set((state) => {
      const newTopics = { ...state.topics, [topic.id]: topic };
      const newTopicsByStage = { ...state.topicsByStage };
      
      // Update stage mapping
      if (topic.stageId) {
        if (!newTopicsByStage[topic.stageId]) {
          newTopicsByStage[topic.stageId] = [];
        }
        if (!newTopicsByStage[topic.stageId].includes(topic.id)) {
          newTopicsByStage[topic.stageId].push(topic.id);
        }
      }
      
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
        topicsByStage: newTopicsByStage,
      };
    }),
  
  setTopicsForStage: (stageId, topics) =>
    set((state) => {
      const newTopics = { ...state.topics };
      const newTopicsByStage = { ...state.topicsByStage, [stageId]: topics.map((t) => t.id) };
      
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
        topicsByStage: newTopicsByStage,
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
      const newTopicsByStage: Record<string, string[]> = {};
      
      // Rebuild stage mappings
      Object.entries(state.topicsByStage).forEach(([stageId, topicIds]) => {
        newTopicsByStage[stageId] = topicIds.filter((id) => id !== topicId);
      });
      
      return {
        topics,
        topicsByStage: newTopicsByStage,
      };
    }),
  
  invalidateSlideUrl: (slideId) =>
    set((state) => {
      const { [slideId]: removed, ...slideUrls } = state.slideUrls;
      return { slideUrls };
    }),
  
  clearTopics: () => set({ topics: {}, topicsByStage: {}, slideUrls: {} }),
}));

// React Query hooks for topics
export function useTopicsByStage(
  stageId: string | null | undefined,
  options?: { includeSlides?: boolean; includeUrls?: boolean }
) {
  const queryClient = useQueryClient();
  const { topics, topicsByStage, setTopicsForStage } = useTopicsStore();

  const query = useQuery({
    queryKey: ["topics", stageId, options?.includeSlides, options?.includeUrls],
    queryFn: async () => {
      if (!stageId) return [];
      
      const result = await topicsApi.get.list({
        stageId,
        limit: 100,
        includeSlides: options?.includeSlides,
        includeUrls: options?.includeUrls,
      });
      
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch topics");
      }
      
      if (result.data) {
        // Update Zustand store with normalized data
        setTopicsForStage(stageId, result.data as TopicWithSlides[]);
        return result.data as TopicWithSlides[];
      }
      
      return [];
    },
    enabled: !!stageId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Use initialData from Zustand if available for instant display
    initialData: () => {
      if (!stageId) return undefined;
      const topicIds = topicsByStage[stageId] || [];
      const zustandTopics = topicIds
        .map((id) => topics[id])
        .filter(Boolean);
      return zustandTopics.length > 0 ? zustandTopics : undefined;
    },
  });

  const topicIds = stageId ? topicsByStage[stageId] || [] : [];
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

  return {
    ...query,
    topics: topicsList,
  };
}

export function useTopic(
  topicId: string | null | undefined,
  options?: { includeSlides?: boolean; includeUrls?: boolean }
) {
  const queryClient = useQueryClient();
  const { topics, setTopic } = useTopicsStore();

  const query = useQuery({
    queryKey: ["topics", "by-id", topicId, options?.includeSlides, options?.includeUrls],
    queryFn: async () => {
      if (!topicId) return null;
      
      const result = await topicsApi.get.byId(topicId);
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch topic");
      }
      
      if (result.data) {
        // If we need URLs, fetch them separately for now
        // (since byId doesn't support includeUrls yet)
        const topicData = result.data as TopicWithSlides;
        
        // Update Zustand store
        setTopic(topicData);
        return topicData;
      }
      
      return null;
    },
    enabled: !!topicId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    // Use initialData from Zustand if available for instant display
    initialData: () => {
      if (!topicId) return undefined;
      const storeTopic = topics[topicId];
      return storeTopic || undefined;
    },
  });

  return {
    ...query,
    topic: topicId ? topics[topicId] || null : null,
  };
}

// Helper function to get cached slide URL
export function useSlideUrl(slideId: string | null | undefined) {
  const { slideUrls } = useTopicsStore();
  
  if (!slideId) return null;
  
  const cached = slideUrls[slideId];
  if (!cached) return null;
  
  // Check if expired
  if (Date.now() - cached.timestamp > CACHE_EXPIRY_MS) {
    return null;
  }
  
  return cached.url;
}

// Helper function to invalidate topic cache
export function useInvalidateTopics() {
  const queryClient = useQueryClient();
  
  return {
    invalidateTopic: (topicId: string) => {
      queryClient.invalidateQueries({ queryKey: ["topics", "by-id", topicId] });
      // Also invalidate any stage queries that might contain this topic
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
    invalidateTopicsByStage: (stageId: string) => {
      queryClient.invalidateQueries({ queryKey: ["topics", stageId] });
    },
    invalidateAllTopics: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  };
}
