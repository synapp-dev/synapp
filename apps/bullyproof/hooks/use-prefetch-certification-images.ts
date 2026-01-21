"use client";

import { useQuery } from "@tanstack/react-query";
import { useCertificationSlidesCacheStore } from "@/stores/certification-slides-cache-store";
import { certificationApi } from "@/entities/certification/api/endpoints";
import type { SlideData } from "@/components/organisms/slide-renderer";

/**
 * Pre-fetches all image URLs for certification slides in the background.
 * Populates the certification slides cache store so images can be loaded instantly.
 * 
 * @param slides - Array of slides to pre-fetch images for
 * @param enabled - Whether to enable the pre-fetching (defaults to true)
 */
export function usePrefetchCertificationImages(
  slides: SlideData[],
  enabled: boolean = true
) {
  // Filter to only image slides that need URLs fetched
  const imageSlideIds = slides
    .filter(
      (slide) =>
        slide.kind === "image" &&
        slide.id &&
        !slide.id.startsWith("temp_") &&
        slide.imageUrl &&
        !slide.imageUrl.startsWith("blob:")
    )
    .map((slide) => slide.id);

  // Use React Query to fetch all image URLs in parallel
  const { isLoading, isError } = useQuery({
    queryKey: ["prefetch-certification-images", imageSlideIds.sort().join(",")],
    queryFn: async () => {
      // Access store state directly using getState()
      const storeState = useCertificationSlidesCacheStore.getState();
      const setSlideUrl = storeState.setSlideUrl;
      const cache = storeState.cache;
      
      // Check cache first - only fetch URLs that aren't already cached
      const uncachedSlideIds = imageSlideIds.filter((slideId) => {
        const cached = cache[slideId];
        if (!cached) return true;
        // Check if cache is expired (older than 7 days)
        const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
        return Date.now() - cached.timestamp > CACHE_EXPIRY_MS;
      });

      if (uncachedSlideIds.length === 0) {
        return { fetched: 0, cached: imageSlideIds.length };
      }

      // Fetch all uncached URLs in parallel
      const results = await Promise.allSettled(
        uncachedSlideIds.map(async (slideId) => {
          try {
            const result = await certificationApi.topics.slides.getImageUrl(slideId);
            if (result.data?.url) {
              // Populate the store cache immediately
              setSlideUrl(slideId, result.data.url);
              return { slideId, success: true };
            }
            return { slideId, success: false };
          } catch (error) {
            console.error(`Failed to fetch image URL for slide ${slideId}:`, error);
            return { slideId, success: false };
          }
        })
      );

      const successful = results.filter(
        (r) => r.status === "fulfilled" && r.value.success
      ).length;

      return {
        fetched: successful,
        cached: imageSlideIds.length - uncachedSlideIds.length,
      };
    },
    enabled: enabled && imageSlideIds.length > 0,
    staleTime: Infinity, // Never consider stale since we're pre-fetching
    gcTime: Infinity, // Keep in cache indefinitely
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    isLoading,
    isError,
    imageSlideCount: imageSlideIds.length,
  };
}
