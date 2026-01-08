import { create } from "zustand";
import { topicsApi } from "@/entities/topics/api/endpoints";
import { useTopicsStore } from "@/entities/topics/model/store-enhanced";

interface SlideUrlCache {
  url: string;
  timestamp: number;
}

interface TopicSlidesCacheState {
  // Cache of slide IDs to their signed URLs
  cache: Record<string, SlideUrlCache>;
  // Loading states for each slide
  loading: Record<string, boolean>;
  // Error states for each slide
  errors: Record<string, string | null>;

  // Get cached URL or fetch if not cached
  getSlideUrl: (
    slideId: string,
    forceRefresh?: boolean
  ) => Promise<string | null>;

  // Invalidate/refresh a specific slide's URL
  invalidateSlide: (slideId: string) => void;

  // Clear all cache
  clearCache: () => void;

  // Set URL directly (useful after upload)
  setSlideUrl: (slideId: string, url: string) => void;
}

// Cache expiry: 1 week in milliseconds (matching the signed URL expiry)
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export const useTopicSlidesCacheStore = create<TopicSlidesCacheState>(
  (set, get) => ({
    cache: {},
    loading: {},
    errors: {},

    getSlideUrl: async (slideId: string, forceRefresh = false) => {
      const state = get();
      const cached = state.cache[slideId];
      const now = Date.now();

      // First check the new topics store for cached URLs (from API responses with includeUrls)
      if (!forceRefresh) {
        const topicsStoreState = useTopicsStore.getState();
        const newStoreCached = topicsStoreState.slideUrls[slideId];
        if (newStoreCached && now - newStoreCached.timestamp < CACHE_EXPIRY_MS) {
          // Also cache it in this store for consistency
          if (!cached || cached.url !== newStoreCached.url) {
            set((s) => ({
              cache: {
                ...s.cache,
                [slideId]: {
                  url: newStoreCached.url,
                  timestamp: newStoreCached.timestamp,
                },
              },
            }));
          }
          return newStoreCached.url;
        }
      }

      // Return cached URL if it exists and is still valid (and not forcing refresh)
      if (!forceRefresh && cached && now - cached.timestamp < CACHE_EXPIRY_MS) {
        return cached.url;
      }

      // If already loading, wait a bit and check cache again
      if (state.loading[slideId]) {
        // Wait for the ongoing request
        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            const currentState = get();
            if (!currentState.loading[slideId]) {
              clearInterval(checkInterval);
              const updatedCache = currentState.cache[slideId];
              if (updatedCache) {
                resolve(updatedCache.url);
              } else {
                resolve(null);
              }
            }
          }, 100);

          // Timeout after 5 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve(null);
          }, 5000);
        });
      }

      // Set loading state
      set((state) => ({
        loading: { ...state.loading, [slideId]: true },
        errors: { ...state.errors, [slideId]: null },
      }));

      try {
        const result = await topicsApi.slides.getImageUrl(slideId);

        if (result.data) {
          // If URL is null, it means no image exists in the bucket
          // Don't cache null URLs, but don't treat as error either
          if (result.data.url === null) {
            set((state) => ({
              loading: { ...state.loading, [slideId]: false },
              errors: { ...state.errors, [slideId]: null },
            }));
            return null;
          }

          // Cache the URL only if it's not null
          set((state) => ({
            cache: {
              ...state.cache,
              [slideId]: {
                url: result.data.url,
                timestamp: now,
              },
            },
            loading: { ...state.loading, [slideId]: false },
            errors: { ...state.errors, [slideId]: null },
          }));

          return result.data.url;
        } else {
          // Handle error
          const errorMessage = result.error?.message || "Failed to load image";
          set((state) => ({
            loading: { ...state.loading, [slideId]: false },
            errors: { ...state.errors, [slideId]: errorMessage },
          }));

          return null;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load image";
        set((state) => ({
          loading: { ...state.loading, [slideId]: false },
          errors: { ...state.errors, [slideId]: errorMessage },
        }));

        return null;
      }
    },

    invalidateSlide: (slideId: string) => {
      set((state) => {
        const newCache = { ...state.cache };
        delete newCache[slideId];

        return {
          cache: newCache,
          errors: { ...state.errors, [slideId]: null },
        };
      });
    },

    clearCache: () => {
      set({
        cache: {},
        errors: {},
      });
    },

    setSlideUrl: (slideId: string, url: string) => {
      set((state) => ({
        cache: {
          ...state.cache,
          [slideId]: {
            url,
            timestamp: Date.now(),
          },
        },
        loading: { ...state.loading, [slideId]: false },
        errors: { ...state.errors, [slideId]: null },
      }));
    },
  })
);
